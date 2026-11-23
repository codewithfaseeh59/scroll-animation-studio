import { expect, test } from '@playwright/test'
import { addFadeInRectangle, opacityOf, scrubTo } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('keyframes with different opacity change the layer while scrubbing the timeline', async ({
  page,
}) => {
  await addFadeInRectangle(page)
  await expect(page.getByRole('button', { name: /^Rectangle 1: keyframe at/ })).toHaveCount(2)

  const layer = page.locator('[data-layer-id]')
  await page.getByRole('slider', { name: 'Playhead' }).press('Home')
  await expect.poll(() => opacityOf(layer)).toBe(0)

  await scrubTo(page, 0.5)
  await expect.poll(() => opacityOf(layer)).toBeGreaterThan(0.3)
  await expect.poll(() => opacityOf(layer)).toBeLessThan(0.7)

  await page.getByRole('slider', { name: 'Playhead' }).press('End')
  await expect.poll(() => opacityOf(layer)).toBe(1)
})

test('a template from the New project dialog fills the stage with layers', async ({ page }) => {
  await expect(page.locator('[data-layer-id]')).toHaveCount(0)
  await page.getByRole('button', { name: 'New project' }).click()
  await page.getByRole('button', { name: /Fade-up title/ }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-layer-id]')).toHaveCount(3)
  await expect(page.getByRole('button', { name: /^Title/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Subtitle/ }).first()).toBeVisible()
})

test('undo and redo work from the keyboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Add rectangle' }).click()
  const layers = page.locator('[data-layer-id]')
  await expect(layers).toHaveCount(1)

  await page.keyboard.press('Control+z')
  await expect(layers).toHaveCount(0)

  await page.keyboard.press('Control+Shift+z')
  await expect(layers).toHaveCount(1)
})
