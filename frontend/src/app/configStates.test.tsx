import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
import { parseConfig } from '@/shared/config/env'
import { installMatchMediaMock } from '@/test/matchMedia'

import { bootstrap } from './main'

const renderAt = (
  source: Record<string, unknown>
): { container: HTMLDivElement; unmount: () => void } => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = bootstrap(container, source)
  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

beforeEach(() => {
  installMatchMediaMock(true)
})

describe('configuration states', () => {
  it('renders only the localized configuration error for a missing required value', async () => {
    await i18n.changeLanguage('es')
    const { container, unmount } = renderAt({})

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Walplay no puede iniciarse' })
    ).toBeInTheDocument()
    expect(container.querySelector('header')).toBeNull()
    expect(container.querySelector('nav')).toBeNull()
    expect(container.textContent).not.toMatch(/VITE_|import\.meta|undefined/)
    expect(vi.mocked(console.warn).mock.calls.length).toBeGreaterThan(0)
    vi.mocked(console.warn).mockClear()

    unmount()
  })

  it('renders only the configuration error for an invalid required value', async () => {
    const { container, unmount } = renderAt({ VITE_APP_ENV: 'prod-ish' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Walplay cannot start' })
    ).toBeInTheDocument()
    expect(container.textContent).not.toContain('prod-ish')
    vi.mocked(console.warn).mockClear()

    unmount()
  })

  it('keeps the visitor experience unchanged when the optional version is absent', async () => {
    const { container, unmount } = renderAt({ VITE_APP_ENV: 'local' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()
    expect(container.textContent).not.toContain('0.0.0')

    const warningText = vi
      .mocked(console.warn)
      .mock.calls.map((call) => call.map(String).join(' '))
      .join(' ')
    expect(warningText).toContain('VITE_APP_VERSION')
    expect(warningText).not.toContain('local')
    vi.mocked(console.warn).mockClear()

    unmount()
  })

  it('applies the default version for empty and invalid optional values', () => {
    const empty = parseConfig({ VITE_APP_ENV: 'local', VITE_APP_VERSION: '' })
    const invalid = parseConfig({ VITE_APP_ENV: 'local', VITE_APP_VERSION: 'version-x' })

    expect(empty.status).toBe('valid')
    expect(invalid.status).toBe('valid')
    if (empty.status !== 'valid' || invalid.status !== 'valid') {
      throw new Error('expected valid configuration')
    }
    expect(empty.config.applicationVersion).toBe('0.0.0')
    expect(invalid.config.applicationVersion).toBe('0.0.0')
    expect(invalid.warnings.join(' ')).not.toContain('version-x')
    vi.mocked(console.warn).mockClear()
  })
})
