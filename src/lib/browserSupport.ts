/**
 * Whether this browser can run CSS scroll-driven animations. It asks the same
 * question as the `@supports (animation-timeline: view())` rule in the exported CSS.
 */
export function supportsScrollDrivenAnimations(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline', 'view()')
  )
}
