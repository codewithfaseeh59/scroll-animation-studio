import {
  ANIMATABLE_PROPERTIES,
  EASE_NAMES,
  LAYER_TYPES,
  PROJECT_VERSION,
  type AnimatableProperty,
  type AspectRatio,
  type EaseName,
  type Keyframe,
  type KeyframeValues,
  type Layer,
  type LayerBase,
  type LayerStyle,
  type LayerType,
  type Project,
} from './types'

export type ValidationResult = { ok: true; project: Project } | { ok: false; errors: string[] }

type UnknownRecord = Record<string, unknown>

interface NumberRule {
  min?: number
  max?: number
  /** When true the value must be strictly greater than `min`. */
  exclusiveMin?: boolean
}

const ANIMATABLE_SET: ReadonlySet<string> = new Set(ANIMATABLE_PROPERTIES)
const EASE_SET: ReadonlySet<string> = new Set(EASE_NAMES)
const LAYER_TYPE_SET: ReadonlySet<string> = new Set(LAYER_TYPES)

const VALUE_RULES: Record<AnimatableProperty, NumberRule> = {
  translateX: {},
  translateY: {},
  scale: {},
  rotate: {},
  opacity: { min: 0, max: 1 },
  blur: { min: 0 },
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

class Reader {
  readonly errors: string[] = []

  fail(path: string, message: string): void {
    this.errors.push(`${path}: ${message}`)
  }

  object(value: unknown, path: string): UnknownRecord | undefined {
    if (isRecord(value)) return value
    this.fail(path, 'must be an object')
    return undefined
  }

  array(value: unknown, path: string): unknown[] | undefined {
    if (Array.isArray(value)) return value as unknown[]
    this.fail(path, 'must be an array')
    return undefined
  }

  string(value: unknown, path: string, allowEmpty: boolean): string | undefined {
    if (typeof value === 'string' && (allowEmpty || value.length > 0)) return value
    this.fail(path, allowEmpty ? 'must be a string' : 'must be a non-empty string')
    return undefined
  }

  number(value: unknown, path: string, rule: NumberRule = {}): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      this.fail(path, 'must be a finite number')
      return undefined
    }
    const { min, max, exclusiveMin } = rule
    if (min !== undefined && (exclusiveMin ? value <= min : value < min)) {
      this.fail(path, `must be ${exclusiveMin ? 'greater than' : 'at least'} ${String(min)}`)
      return undefined
    }
    if (max !== undefined && value > max) {
      this.fail(path, `must be at most ${String(max)}`)
      return undefined
    }
    return value
  }
}

function readEase(r: Reader, value: unknown, path: string): EaseName | undefined {
  if (typeof value === 'string' && EASE_SET.has(value)) return value as EaseName
  r.fail(path, `must be one of ${EASE_NAMES.join(', ')}`)
  return undefined
}

function readLayerType(r: Reader, value: unknown, path: string): LayerType | undefined {
  if (typeof value === 'string' && LAYER_TYPE_SET.has(value)) return value as LayerType
  r.fail(path, `must be one of ${LAYER_TYPES.join(', ')}`)
  return undefined
}

function readValues(r: Reader, value: unknown, path: string): KeyframeValues | undefined {
  const obj = r.object(value, path)
  if (!obj) return undefined
  const values: KeyframeValues = {}
  for (const [key, raw] of Object.entries(obj)) {
    if (!ANIMATABLE_SET.has(key)) {
      r.fail(`${path}.${key}`, 'is not an animatable property')
      continue
    }
    const property = key as AnimatableProperty
    const number = r.number(raw, `${path}.${key}`, VALUE_RULES[property])
    if (number !== undefined) values[property] = number
  }
  return values
}

function readKeyframe(r: Reader, value: unknown, path: string): Keyframe | undefined {
  const obj = r.object(value, path)
  if (!obj) return undefined
  const id = r.string(obj.id, `${path}.id`, false)
  const progress = r.number(obj.progress, `${path}.progress`, { min: 0, max: 1 })
  const values = readValues(r, obj.values, `${path}.values`)
  const ease = readEase(r, obj.ease, `${path}.ease`)
  if (id === undefined || progress === undefined || !values || ease === undefined) return undefined
  return { id, progress, values, ease }
}

function readKeyframes(r: Reader, value: unknown, path: string): Keyframe[] | undefined {
  const items = r.array(value, path)
  if (!items) return undefined
  const keyframes: Keyframe[] = []
  const ids = new Set<string>()
  items.forEach((item, index) => {
    const keyframePath = `${path}[${String(index)}]`
    const keyframe = readKeyframe(r, item, keyframePath)
    if (!keyframe) return
    if (ids.has(keyframe.id)) r.fail(`${keyframePath}.id`, `duplicate id "${keyframe.id}"`)
    ids.add(keyframe.id)
    const previous = keyframes[keyframes.length - 1]
    if (previous && keyframe.progress <= previous.progress) {
      r.fail(`${keyframePath}.progress`, 'must be greater than the previous keyframe progress')
    }
    keyframes.push(keyframe)
  })
  return keyframes
}

function readBase(r: Reader, value: unknown, path: string): LayerBase | undefined {
  const obj = r.object(value, path)
  if (!obj) return undefined
  const x = r.number(obj.x, `${path}.x`)
  const y = r.number(obj.y, `${path}.y`)
  const width = r.number(obj.width, `${path}.width`, { min: 0, exclusiveMin: true })
  const height = r.number(obj.height, `${path}.height`, { min: 0, exclusiveMin: true })
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined
  }
  return { x, y, width, height }
}

function readStyle(r: Reader, value: unknown, path: string): LayerStyle | undefined {
  const obj = r.object(value, path)
  if (!obj) return undefined
  const color = r.string(obj.color, `${path}.color`, true)
  const text = r.string(obj.text, `${path}.text`, true)
  const fontSize = r.number(obj.fontSize, `${path}.fontSize`, { min: 0, exclusiveMin: true })
  const src = r.string(obj.src, `${path}.src`, true)
  const radius = r.number(obj.radius, `${path}.radius`, { min: 0 })
  if (
    color === undefined ||
    text === undefined ||
    fontSize === undefined ||
    src === undefined ||
    radius === undefined
  ) {
    return undefined
  }
  return { color, text, fontSize, src, radius }
}

function readLayer(r: Reader, value: unknown, path: string): Layer | undefined {
  const obj = r.object(value, path)
  if (!obj) return undefined
  const id = r.string(obj.id, `${path}.id`, false)
  const name = r.string(obj.name, `${path}.name`, true)
  const type = readLayerType(r, obj.type, `${path}.type`)
  const base = readBase(r, obj.base, `${path}.base`)
  const style = readStyle(r, obj.style, `${path}.style`)
  const keyframes = readKeyframes(r, obj.keyframes, `${path}.keyframes`)
  if (
    id === undefined ||
    name === undefined ||
    type === undefined ||
    !base ||
    !style ||
    !keyframes
  ) {
    return undefined
  }
  return { id, name, type, base, style, keyframes }
}

function readLayers(r: Reader, value: unknown, path: string): Layer[] | undefined {
  const items = r.array(value, path)
  if (!items) return undefined
  const layers: Layer[] = []
  const ids = new Set<string>()
  items.forEach((item, index) => {
    const layerPath = `${path}[${String(index)}]`
    const layer = readLayer(r, item, layerPath)
    if (!layer) return
    if (ids.has(layer.id)) r.fail(`${layerPath}.id`, `duplicate id "${layer.id}"`)
    ids.add(layer.id)
    layers.push(layer)
  })
  return layers
}

function readAspectRatio(r: Reader, value: unknown, path: string): AspectRatio | undefined {
  const obj = r.object(value, path)
  if (!obj) return undefined
  const width = r.number(obj.width, `${path}.width`, { min: 0, exclusiveMin: true })
  const height = r.number(obj.height, `${path}.height`, { min: 0, exclusiveMin: true })
  if (width === undefined || height === undefined) return undefined
  return { width, height }
}

/**
 * Checks that unknown data (a parsed file, a URL hash, localStorage) is a valid
 * current-version Project. Never throws. Returns a rebuilt Project, so unknown
 * extra fields are dropped, or the list of every problem found.
 */
export function validateProject(input: unknown): ValidationResult {
  const r = new Reader()
  const root = r.object(input, 'project')
  if (!root) return { ok: false, errors: r.errors }

  if (root.version !== PROJECT_VERSION) {
    r.fail('project.version', `must be ${String(PROJECT_VERSION)}`)
  }
  const name = r.string(root.name, 'project.name', true)
  const sceneLength = r.number(root.sceneLength, 'project.sceneLength', {
    min: 0,
    exclusiveMin: true,
  })
  const aspectRatio = readAspectRatio(r, root.aspectRatio, 'project.aspectRatio')
  const layers = readLayers(r, root.layers, 'project.layers')

  if (
    r.errors.length > 0 ||
    name === undefined ||
    sceneLength === undefined ||
    !aspectRatio ||
    !layers
  ) {
    return { ok: false, errors: r.errors }
  }
  return { ok: true, project: { version: PROJECT_VERSION, name, sceneLength, aspectRatio, layers } }
}
