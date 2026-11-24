import { useEffect, useRef, useState } from 'react'

import { TRAILER_PLAYER_MIN_WIDTH_PX } from '@/shared/config/trailerPlatform'

export interface EmbedWidth {
  readonly ref: (element: HTMLElement | null) => void
  readonly width: number
  readonly canEmbed: boolean
}

export const useEmbedWidth = (): EmbedWidth => {
  const elementRef = useRef<HTMLElement | null>(null)
  const [width, setWidth] = useState(0)

  const ref = (element: HTMLElement | null): void => {
    elementRef.current = element
  }

  useEffect(() => {
    const element = elementRef.current
    if (element === null) {
      return undefined
    }

    setWidth(element.getBoundingClientRect().width)

    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry !== undefined) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return {
    ref,
    width,
    canEmbed: width >= TRAILER_PLAYER_MIN_WIDTH_PX,
  }
}
