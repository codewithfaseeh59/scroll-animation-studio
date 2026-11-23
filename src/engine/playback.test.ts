import { advancePlayhead, playbackDuration, SECONDS_PER_VIEWPORT } from './playback'

describe('playbackDuration', () => {
  it('takes 1.5 seconds per viewport height: 4 viewport heights take 6 seconds', () => {
    expect(SECONDS_PER_VIEWPORT).toBe(1.5)
    expect(playbackDuration(4)).toBe(6)
  })

  it('scales with the scene length: 2 viewport heights take 3 seconds', () => {
    expect(playbackDuration(2)).toBe(3)
  })
})

describe('advancePlayhead', () => {
  it('moves forward by the share of the duration: 1.5s of 6s is 0.25', () => {
    expect(advancePlayhead(0, 1.5, 6)).toEqual({ playhead: 0.25, finished: false })
  })

  it('continues from where the playhead is: 0.25 + 3s of 6s is 0.75', () => {
    expect(advancePlayhead(0.25, 3, 6)).toEqual({ playhead: 0.75, finished: false })
  })

  it('does not move when no time has passed', () => {
    expect(advancePlayhead(0.4, 0, 6)).toEqual({ playhead: 0.4, finished: false })
  })

  it('finishes exactly at the end: 0.5 + 3s of 6s is 1', () => {
    expect(advancePlayhead(0.5, 3, 6)).toEqual({ playhead: 1, finished: true })
  })

  it('stops at 1 when the step would overshoot: 0.9 + 3s of 6s is capped at 1', () => {
    expect(advancePlayhead(0.9, 3, 6)).toEqual({ playhead: 1, finished: true })
  })
})
