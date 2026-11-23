import { isRecord, type UnknownRecord } from '../lib/isRecord'
import { PROJECT_VERSION } from './types'

export type MigrationResult = { ok: true; data: unknown } | { ok: false; error: string }

function addMissingEase(layer: unknown): unknown {
  if (!isRecord(layer) || !Array.isArray(layer.keyframes)) return layer
  const keyframes = (layer.keyframes as unknown[]).map((keyframe) =>
    isRecord(keyframe) && keyframe.ease === undefined ? { ...keyframe, ease: 'linear' } : keyframe,
  )
  return { ...layer, keyframes }
}

/**
 * Each entry upgrades a project from the version that is its key to the next
 * version. Version 0 files predate the aspect ratio and the keyframe easing:
 * they were always 16:9 and always linear.
 */
const MIGRATIONS: Record<number, (project: UnknownRecord) => UnknownRecord> = {
  0: (project) => ({
    ...project,
    version: 1,
    aspectRatio: project.aspectRatio ?? { width: 16, height: 9 },
    layers: Array.isArray(project.layers)
      ? (project.layers as unknown[]).map(addMissingEase)
      : project.layers,
  }),
}

/**
 * Upgrades project data of an older version to the current version, one step at
 * a time. It does not check the data itself (validateProject does); it only
 * needs the version. Never throws, and does not change its input.
 */
export function migrateProject(input: unknown): MigrationResult {
  if (!isRecord(input)) return { ok: false, error: 'The file is not a ScrollStudio project.' }
  const version = input.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    return { ok: false, error: 'The file has no valid version number.' }
  }
  if (version > PROJECT_VERSION) {
    return {
      ok: false,
      error: `The file was made with a newer version of ScrollStudio (file version ${String(version)}, this version reads up to ${String(PROJECT_VERSION)}).`,
    }
  }

  let data: UnknownRecord = input
  for (let from = version; from < PROJECT_VERSION; from++) {
    const migrate = MIGRATIONS[from]
    if (!migrate) {
      return { ok: false, error: `There is no upgrade from file version ${String(from)}.` }
    }
    data = migrate(data)
  }
  return { ok: true, data }
}
