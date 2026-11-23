import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useMatches } from 'react-router'

import { PAGE_HEADING_ID } from '@/shared/lib/domIds'

interface RouteHandle {
  readonly titleKey?: string
}

const MAX_FOCUS_FRAMES = 240

export interface RouteAnnouncementResult {
  readonly announcement: string
}

export const useRouteAnnouncement = (): RouteAnnouncementResult => {
  const location = useLocation()
  const matches = useMatches()
  const { t } = useTranslation()
  const [announcement, setAnnouncement] = useState('')
  const isInitialLoad = useRef(true)

  const titleKey = matches
    .map((match) => (match.handle as RouteHandle | undefined)?.titleKey)
    .filter((key): key is string => typeof key === 'string')
    .at(-1)

  const message = t('a11y.navigatedTo', { title: t(titleKey ?? 'meta.title.app') })
  const messageRef = useRef(message)

  useEffect(() => {
    messageRef.current = message
  }, [message])

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    let cancelled = false
    let frame = 0
    let frames = 0
    let announced = false

    const settle = (): void => {
      if (cancelled) {
        return
      }

      const heading = document.getElementById(PAGE_HEADING_ID)
      const active = document.activeElement
      const focusNeedsRestoring =
        active === null ||
        active === document.body ||
        !(active instanceof HTMLElement) ||
        !active.isConnected

      if (heading !== null && (!announced || focusNeedsRestoring)) {
        heading.focus()
        if (!announced) {
          announced = true
          setAnnouncement(messageRef.current)
        }
      }

      frames += 1
      if (frames <= MAX_FOCUS_FRAMES) {
        frame = requestAnimationFrame(settle)
      }
    }

    frame = requestAnimationFrame(settle)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [location.pathname])

  return { announcement }
}
