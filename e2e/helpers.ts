import { expect, type Locator, type Page } from '@playwright/test'

/** Adds a rectangle and gives it opacity 0 at the start and 1 at the end of the scene. */
export async function addFadeInRectangle(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add rectangle' }).click()
  const opacity = page.getByLabel('Opacity', { exact: true })
  await opacity.fill('0')
  await opacity.press('Enter')
  await page.getByRole('slider', { name: 'Playhead' }).press('End')
  await opacity.fill('1')
  await opacity.press('Enter')
}

/** The computed opacity of a layer, as a number. */
export async function opacityOf(layer: Locator): Promise<number> {
  return layer.evaluate((element) => Number(getComputedStyle(element).opacity))
}

/** Clicks the timeline ruler at a fraction of its width, as a user scrubbing would. */
export async function scrubTo(page: Page, fraction: number): Promise<void> {
  const box = await page.getByRole('slider', { name: 'Playhead' }).boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2)
}
