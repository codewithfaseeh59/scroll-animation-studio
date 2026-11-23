import { createLayer, createProject } from './document'
import {
  MAX_SHARE_LENGTH,
  createShareHash,
  isShareHash,
  parseProject,
  readShareHash,
  serializeProject,
} from './serialize'
import type { Project } from './types'

function sampleProject(): Project {
  const title = createLayer('t', 'text', 'Hero title')
  return {
    ...createProject(),
    name: 'Demo',
    sceneLength: 3.5,
    layers: [
      createLayer('b', 'rect', 'Box'),
      {
        ...title,
        style: { ...title.style, text: 'Hello "world" <b>&</b>' },
        keyframes: [
          { id: 'k0', progress: 0, values: { opacity: 0, translateY: 20 }, ease: 'linear' },
          { id: 'k1', progress: 0.5, values: { opacity: 1, translateY: 0 }, ease: 'power2Out' },
        ],
      },
    ],
  }
}

/** Text that does not compress, built from a fixed formula so the test is repeatable. */
function incompressibleText(length: number): string {
  let seed = 12345
  let text = ''
  for (let index = 0; index < length; index++) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    text += String.fromCharCode(33 + (seed % 90))
  }
  return text.replaceAll('"', "'").replaceAll('\\', '/')
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

async function gzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  void writer.write(bytes)
  void writer.close()
  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

describe('serializeProject and parseProject', () => {
  it('writes indented JSON that ends with a newline', () => {
    const text = serializeProject(sampleProject())
    expect(text).toContain('\n  "sceneLength": 3.5,')
    expect(text.endsWith('}\n')).toBe(true)
  })

  it('round trips: parsing the written text gives the same project', () => {
    const project = sampleProject()
    expect(parseProject(serializeProject(project))).toEqual({ ok: true, project })
  })

  it('upgrades a file of an older version while reading it', () => {
    const legacy = JSON.stringify({
      version: 0,
      name: 'Old',
      sceneLength: 2,
      layers: [
        {
          id: 'l',
          name: 'Box',
          type: 'rect',
          base: { x: 0, y: 0, width: 10, height: 10 },
          style: { color: '#000000', text: '', fontSize: 16, src: '', radius: 0 },
          keyframes: [{ id: 'k', progress: 0.5, values: { opacity: 1 } }],
        },
      ],
    })
    const result = parseProject(legacy)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.project.version).toBe(1)
      expect(result.project.aspectRatio).toEqual({ width: 16, height: 9 })
      expect(result.project.layers[0]?.keyframes[0]?.ease).toBe('linear')
    }
  })

  it('gives a clear error for text that is not JSON', () => {
    expect(parseProject('not json {')).toEqual({ ok: false, error: 'The file is not valid JSON.' })
    expect(parseProject('')).toEqual({ ok: false, error: 'The file is not valid JSON.' })
  })

  it.each(['null', '42', '"text"', '[]', '{}', '{"version": 1}'])(
    'gives an error, not a project or a throw, for %s',
    (text) => {
      expect(parseProject(text).ok).toBe(false)
    },
  )

  it('names the problem in a project that is the wrong shape', () => {
    const broken = { ...sampleProject(), sceneLength: 0 }
    const result = parseProject(JSON.stringify(broken))
    expect(result).toEqual({
      ok: false,
      error: 'The project is not valid: project.sceneLength: must be greater than 0',
    })
  })

  it('reports at most three problems and counts the rest', () => {
    const result = parseProject(
      JSON.stringify({ version: 1, name: 1, sceneLength: 0, aspectRatio: 5, layers: 'x' }),
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('(and 1 more)')
  })

  it('refuses a version from the future', () => {
    const result = parseProject(JSON.stringify({ ...sampleProject(), version: 9 }))
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('newer version')
  })

  it('refuses text over the size limit without parsing it', () => {
    const result = parseProject('x'.repeat(5_000_001))
    expect(result).toEqual({ ok: false, error: 'The file is too large.' })
  })
})

describe('share links', () => {
  it('round trips a project through a URL hash', async () => {
    const project = sampleProject()
    const shared = await createShareHash(project)
    expect(shared.ok).toBe(true)
    if (!shared.ok) return
    expect(await readShareHash(shared.hash)).toEqual({ ok: true, project })
  })

  it('makes a hash that starts with #share=1. and only uses URL-safe characters', async () => {
    const shared = await createShareHash(sampleProject())
    expect(shared.ok && shared.hash.startsWith('#share=1.')).toBe(true)
    expect(shared.ok && /^#share=1\.[A-Za-z0-9_-]+$/.test(shared.hash)).toBe(true)
  })

  it('is smaller than the plain JSON for a project with repeated parts', async () => {
    const project = {
      ...createProject(),
      layers: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => createLayer(`l${String(n)}`, 'rect', 'Box')),
    }
    const shared = await createShareHash(project)
    expect(shared.ok).toBe(true)
    expect(shared.ok && shared.hash.length).toBeLessThan(JSON.stringify(project).length)
  })

  it('reads a hash with or without the leading #', async () => {
    const project = sampleProject()
    const shared = await createShareHash(project)
    if (!shared.ok) throw new Error(shared.error)
    expect(await readShareHash(shared.hash.slice(1))).toEqual({ ok: true, project })
  })

  it('keeps text with quotes, markup and non-ASCII characters', async () => {
    const title = createLayer('t', 'text', 'Ünï "cødé" 日本語')
    const project = { ...createProject(), layers: [title] }
    const shared = await createShareHash(project)
    if (!shared.ok) throw new Error(shared.error)
    expect(await readShareHash(shared.hash)).toEqual({ ok: true, project })
  })

  it('refuses a project too large for a link, naming the limit', async () => {
    const layer = createLayer('t', 'text', 'Big')
    const project = {
      ...createProject(),
      layers: [{ ...layer, style: { ...layer.style, text: incompressibleText(20000) } }],
    }
    const result = await createShareHash(project)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain(`the limit is ${String(MAX_SHARE_LENGTH)}`)
  })

  it('refuses a project whose JSON alone is over a megabyte, even if it would compress', async () => {
    const layer = createLayer('t', 'text', 'Big')
    const project = {
      ...createProject(),
      layers: [{ ...layer, style: { ...layer.style, text: 'a'.repeat(1_100_000) } }],
    }
    const result = await createShareHash(project)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('bytes of JSON')
  })

  it.each([
    ['an empty hash', ''],
    ['only a #', '#'],
    ['a different hash', '#section-2'],
    ['no payload', '#share=1.'],
    ['an unknown format version', '#share=2.AAAA'],
    ['characters that are not base64url', '#share=1.!!!!'],
    ['a payload of an impossible length', '#share=1.AAAAA'],
    ['valid base64 that is not gzip', '#share=1.AAAAAAAA'],
    ['gzip cut off in the middle', '#share=1.H4sIAAAAAAAA'],
  ])('gives an error for %s', async (_name, hash) => {
    const result = await readShareHash(hash)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).not.toBe('')
  })

  it('gives an error for gzip that holds something other than a project', async () => {
    const bytes = await gzip(new TextEncoder().encode('{"hello": "world"}'))
    const result = await readShareHash(`#share=1.${toBase64Url(bytes)}`)
    expect(result.ok).toBe(false)
  })

  it('refuses a payload that is too long before decoding it', async () => {
    const result = await readShareHash(`#share=1.${'A'.repeat(MAX_SHARE_LENGTH + 1)}`)
    expect(result).toEqual({ ok: false, error: 'The share link is too large.' })
  })

  it('refuses a small link that would inflate to over a megabyte', async () => {
    const bomb = await gzip(new TextEncoder().encode('a'.repeat(2_000_000)))
    expect(bomb.length).toBeLessThan(MAX_SHARE_LENGTH)
    const result = await readShareHash(`#share=1.${toBase64Url(bomb)}`)
    expect(result).toEqual({ ok: false, error: 'The share link is too large to open safely.' })
  })

  it('knows which hashes are share links', () => {
    expect(isShareHash('#share=1.abc')).toBe(true)
    expect(isShareHash('share=1.abc')).toBe(true)
    expect(isShareHash('#share=')).toBe(true)
    expect(isShareHash('#about')).toBe(false)
    expect(isShareHash('')).toBe(false)
  })
})
