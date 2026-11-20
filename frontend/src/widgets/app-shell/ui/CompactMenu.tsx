import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useLocation } from 'react-router'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui'

export interface CompactMenuProps {
  triggerLabel: string
  closeLabel: string
  title: string
  children: ReactNode
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const CompactMenu = ({ triggerLabel, closeLabel, title, children }: CompactMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const dialogId = useId()
  const titleId = useId()
  const previousPathname = useRef(location.pathname)

  const close = useCallback((restoreFocus = true) => {
    const dialog = dialogRef.current
    if (dialog) {
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
    setIsOpen(false)
    if (restoreFocus) {
      triggerRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }

    const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    firstFocusable?.focus()

    return () => {
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (previousPathname.current === location.pathname) {
      return
    }
    previousPathname.current = location.pathname
    if (isOpen) {
      close(false)
    }
  }, [location.pathname, isOpen, close])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQueryList = window.matchMedia('(min-width: 768px)')
    const handleChange = (event: MediaQueryListEvent): void => {
      if (event.matches) {
        close(false)
      }
    }

    mediaQueryList.addEventListener('change', handleChange)
    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [close])

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return
    }

    const focusables = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    )
    const first = focusables[0]
    const last = focusables.at(-1)

    if (!first || !last) {
      event.preventDefault()
      return
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        aria-label={triggerLabel}
        onClick={() => setIsOpen(true)}
        className="md:hidden"
      >
        <span aria-hidden="true" className="flex flex-col gap-1">
          <span className="block h-0.5 w-5 rounded-full bg-primary" />
          <span className="block h-0.5 w-5 rounded-full bg-primary" />
          <span className="block h-0.5 w-5 rounded-full bg-primary" />
        </span>
      </Button>

      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        onClose={() => close(false)}
        className={cn(
          'm-0 h-full max-h-none w-full max-w-sm border-0 bg-surface p-6 text-text backdrop:bg-canvas/80',
          'open:block'
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-title text-text">
            {title}
          </h2>
          <Button variant="ghost" onClick={() => close()} aria-label={closeLabel}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className="text-primary"
            >
              <path d="M5 5 L15 15 M15 5 L5 15" />
            </svg>
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </dialog>
    </>
  )
}
