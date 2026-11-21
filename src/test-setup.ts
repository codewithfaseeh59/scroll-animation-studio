import '@testing-library/jest-dom/vitest'

export function mockPrefersDark(matches: boolean): void {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
}

mockPrefersDark(false)
