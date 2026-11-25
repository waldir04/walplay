import { vi } from 'vitest'

export const stubMeasuredWidth = (width: number): void => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: (width * 9) / 16,
    top: 0,
    left: 0,
    right: width,
    bottom: (width * 9) / 16,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}
