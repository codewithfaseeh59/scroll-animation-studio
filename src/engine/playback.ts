/** How long the preview takes to play through one viewport height of scene. */
export const SECONDS_PER_VIEWPORT = 1.5

/** Seconds the preview needs to play the whole scene: 4 viewport heights take 6 seconds. */
export function playbackDuration(sceneLength: number): number {
  return sceneLength * SECONDS_PER_VIEWPORT
}

export interface PlaybackStep {
  playhead: number
  /** True when the end of the scene was reached, so playback should stop. */
  finished: boolean
}

/**
 * Moves the playhead forward by `deltaSeconds` of playback time. The scene
 * lasts `durationSeconds`. The playhead stops at 1 and reports `finished`.
 */
export function advancePlayhead(
  playhead: number,
  deltaSeconds: number,
  durationSeconds: number,
): PlaybackStep {
  const next = playhead + deltaSeconds / durationSeconds
  if (next >= 1) return { playhead: 1, finished: true }
  return { playhead: next, finished: false }
}
