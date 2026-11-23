import { toStageUnits } from './units'

describe('toStageUnits', () => {
  it('measures against a stage 1000 units wide: 32 is 3.2cqw', () => {
    expect(toStageUnits(32)).toBe('3.2cqw')
  })

  it('48 is 4.8cqw and 20 is 2cqw', () => {
    expect(toStageUnits(48)).toBe('4.8cqw')
    expect(toStageUnits(20)).toBe('2cqw')
  })

  it('0 is 0cqw', () => {
    expect(toStageUnits(0)).toBe('0cqw')
  })
})
