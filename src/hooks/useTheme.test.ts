import { act, renderHook } from '@testing-library/react'
import { mockPrefersDark } from '../test-setup'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  it('starts light when the system prefers light and writes data-theme', () => {
    mockPrefersDark(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('starts dark when the system prefers dark', () => {
    mockPrefersDark(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggles between light and dark', () => {
    mockPrefersDark(false)
    const { result } = renderHook(() => useTheme())
    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('light')
  })
})
