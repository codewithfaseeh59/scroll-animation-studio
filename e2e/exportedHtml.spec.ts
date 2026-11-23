import { expect, test } from '@playwright/test'
import { addFadeInRectangle, opacityOf } from './helpers'

test('the exported single-file HTML animates the layer as the page scrolls', async ({
  page,
  browser,
}) => {
  await page.goto('/')
  await addFadeInRectangle(page)
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('tab', { name: 'Single-file HTML' }).click()
  const html = await page.getByRole('tabpanel').locator('pre code').innerText()
  expect(html).toContain('animation-timeline')

  const exported = await browser.newPage({ viewport: { width: 1000, height: 600 } })
  const supported = await exported.evaluate(() => CSS.supports('animation-timeline', 'view()'))
  test.skip(
    !supported,
    'This browser does not support CSS scroll-driven animations (animation-timeline), so the exported page cannot be tested here.',
  )

  await exported.setContent(html)
  const layer = exported.locator('.scene__layer')
  await expect.poll(() => opacityOf(layer)).toBe(0)

  const scrollable = await exported.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(scrollable).toBeGreaterThan(0)

  await exported.evaluate((distance) => {
    window.scrollTo(0, distance / 2)
  }, scrollable)
  await expect.poll(() => opacityOf(layer)).toBeGreaterThan(0.3)
  await expect.poll(() => opacityOf(layer)).toBeLessThan(0.7)

  await exported.evaluate((distance) => {
    window.scrollTo(0, distance)
  }, scrollable)
  await expect.poll(() => opacityOf(layer)).toBe(1)
})
