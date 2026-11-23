/**
 * Font sizes and radii are measured against a reference stage that is 1000
 * units wide, so 32 means 3.2% of the stage width (3.2cqw). The stage is a
 * size container, which makes the layout scale with the stage, both in the
 * editor and in exported code.
 */
const STAGE_UNITS = 1000

export function toStageUnits(value: number): string {
  return `${String((value * 100) / STAGE_UNITS)}cqw`
}
