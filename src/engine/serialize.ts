import { migrateProject } from './migrate'
import type { Project } from './types'
import { validateProject } from './validate'

/** The largest project file that is read, in characters. */
export const MAX_FILE_BYTES = 5_000_000
/** The largest project, as JSON, that a share link may hold, before and after compression. */
export const MAX_SHARE_JSON_BYTES = 1_000_000
/** The longest share link payload, in characters. Longer links are refused. */
export const MAX_SHARE_LENGTH = 8000

const SHARE_PREFIX = 'share=1.'
const MAX_REPORTED_ERRORS = 3

export type ParseResult = { ok: true; project: Project } | { ok: false; error: string }
export type ShareResult = { ok: true; hash: string } | { ok: false; error: string }

/** The project as the text of a .json file, readable by parseProject. */
export function serializeProject(project: Project): string {
  return `${JSON.stringify(project, null, 2)}\n`
}

/**
 * Reads a project from JSON text: parses it, upgrades an older version and
 * checks the result. Anything wrong gives an error message instead of a throw.
 */
export function parseProject(text: string): ParseResult {
  if (text.length > MAX_FILE_BYTES) return { ok: false, error: 'The file is too large.' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' }
  }
  const migrated = migrateProject(data)
  if (!migrated.ok) return migrated
  const validated = validateProject(migrated.data)
  if (validated.ok) return validated
  const shown = validated.errors.slice(0, MAX_REPORTED_ERRORS).join('; ')
  const more = validated.errors.length - MAX_REPORTED_ERRORS
  return {
    ok: false,
    error: `The project is not valid: ${shown}${more > 0 ? ` (and ${String(more)} more)` : ''}`,
  }
}

class TooLargeError extends Error {}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let start = 0; start < bytes.length; start += 0x2000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x2000))
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/')
  try {
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

/** Runs bytes through a compression or decompression stream, refusing output over `maxBytes`. */
async function pipe(
  input: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const writer = stream.writable.getWriter()
  writer.write(input).catch(() => undefined)
  writer.close().catch(() => undefined)
  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel()
      throw new TooLargeError()
    }
    chunks.push(value)
  }
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

/** True when the URL hash is a ScrollStudio share link, whether or not it is a good one. */
export function isShareHash(hash: string): boolean {
  return hash.replace(/^#/, '').startsWith('share=')
}

/**
 * A URL hash that holds the whole project (compressed JSON, URL-safe). It is
 * refused when the project is too big for a link to stay usable.
 */
export async function createShareHash(project: Project): Promise<ShareResult> {
  const json = new TextEncoder().encode(JSON.stringify(project))
  const tooLarge = (size: string): ShareResult => ({
    ok: false,
    error: `This project is too large for a share link (${size}). Use Export, Project JSON instead.`,
  })
  if (json.length > MAX_SHARE_JSON_BYTES) return tooLarge(`${String(json.length)} bytes of JSON`)
  const compressed = await pipe(json, new CompressionStream('gzip'), Infinity)
  const payload = toBase64Url(compressed)
  if (payload.length > MAX_SHARE_LENGTH) {
    return tooLarge(
      `${String(payload.length)} characters, the limit is ${String(MAX_SHARE_LENGTH)}`,
    )
  }
  return { ok: true, hash: `#${SHARE_PREFIX}${payload}` }
}

/**
 * Opens a share link made by createShareHash. Bad input of any kind (a wrong
 * prefix, damaged text, data that is not gzip, a project that fails
 * validation, something that would inflate too large) gives an error message.
 */
export async function readShareHash(hash: string): Promise<ParseResult> {
  const text = hash.replace(/^#/, '')
  if (!text.startsWith('share=')) return { ok: false, error: 'This is not a share link.' }
  if (!text.startsWith(SHARE_PREFIX)) {
    return { ok: false, error: 'This share link was made by a different version of ScrollStudio.' }
  }
  const payload = text.slice(SHARE_PREFIX.length)
  if (payload.length > MAX_SHARE_LENGTH) return { ok: false, error: 'The share link is too large.' }
  const bytes = fromBase64Url(payload)
  if (!bytes || bytes.length === 0) {
    return { ok: false, error: 'The share link is damaged.' }
  }
  try {
    const json = await pipe(bytes, new DecompressionStream('gzip'), MAX_SHARE_JSON_BYTES)
    return parseProject(new TextDecoder('utf-8', { fatal: true }).decode(json))
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof TooLargeError
          ? 'The share link is too large to open safely.'
          : 'The share link is damaged.',
    }
  }
}
