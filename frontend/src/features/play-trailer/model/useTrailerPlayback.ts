import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  PlayerUnavailableReason,
  TrailerPlaybackStatus,
  TrailerVideo,
} from '@/entities/catalog'
import { TRAILER_PLAYER_LOAD_TIMEOUT_MS } from '@/shared/config/trailerPlatform'

export type TrailerAnnouncementKind = 'selected' | 'ready' | 'unavailable' | 'external-only'

export interface TrailerAnnouncement {
  readonly kind: TrailerAnnouncementKind
  readonly video: TrailerVideo
  readonly nonce: number
}

export interface UseTrailerPlaybackOptions {
  readonly videos: readonly TrailerVideo[]
  readonly canEmbed: boolean
  readonly loadTimeoutMs?: number
}

export interface TrailerPlayback {
  readonly selectedVideo: TrailerVideo | undefined
  readonly activeVideo: TrailerVideo | undefined
  readonly status: TrailerPlaybackStatus
  readonly reason: PlayerUnavailableReason | null
  readonly announcement: TrailerAnnouncement | null
  readonly activate: (video: TrailerVideo) => void
  readonly onFrameLoad: (videoId: string) => void
}

export const useTrailerPlayback = ({
  videos,
  canEmbed,
  loadTimeoutMs = TRAILER_PLAYER_LOAD_TIMEOUT_MS,
}: UseTrailerPlaybackOptions): TrailerPlayback => {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [status, setStatus] = useState<TrailerPlaybackStatus>('idle')
  const [reason, setReason] = useState<PlayerUnavailableReason | null>(null)
  const [announcement, setAnnouncement] = useState<TrailerAnnouncement | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const choiceRef = useRef(0)
  const activeIdRef = useRef<string | null>(null)
  const statusRef = useRef<TrailerPlaybackStatus>('idle')
  const canEmbedRef = useRef(canEmbed)
  const nonceRef = useRef(0)

  canEmbedRef.current = canEmbed
  activeIdRef.current = activeId
  statusRef.current = status

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const announce = useCallback((kind: TrailerAnnouncementKind, video: TrailerVideo) => {
    nonceRef.current += 1
    setAnnouncement({ kind, video, nonce: nonceRef.current })
  }, [])

  const selectedVideo = videos.find((video) => video.id === selectedId) ?? videos[0]
  const activeVideo = activeId === null ? undefined : videos.find((video) => video.id === activeId)

  const activate = useCallback(
    (video: TrailerVideo) => {
      choiceRef.current += 1
      const choice = choiceRef.current
      clearTimer()
      setSelectedId(video.id)
      setReason(null)

      if (!canEmbedRef.current || video.embedUrl === undefined) {
        setActiveId(null)
        setStatus('external-only')
        setReason('width-too-small')
        announce('external-only', video)
        return
      }

      setActiveId(video.id)
      setStatus('loading')
      announce('selected', video)

      timerRef.current = setTimeout(() => {
        if (choiceRef.current !== choice || activeIdRef.current !== video.id) {
          return
        }
        timerRef.current = null
        setActiveId(null)
        setStatus('unavailable')
        setReason('player-timeout')
        announce('unavailable', video)
      }, loadTimeoutMs)
    },
    [announce, clearTimer, loadTimeoutMs]
  )

  const onFrameLoad = useCallback(
    (videoId: string) => {
      if (activeIdRef.current !== videoId || statusRef.current !== 'loading') {
        return
      }
      clearTimer()
      setStatus('ready')
      const video = videos.find((candidate) => candidate.id === videoId)
      if (video !== undefined) {
        announce('ready', video)
      }
    },
    [announce, clearTimer, videos]
  )

  return {
    selectedVideo,
    activeVideo,
    status,
    reason,
    announcement,
    activate,
    onFrameLoad,
  }
}
