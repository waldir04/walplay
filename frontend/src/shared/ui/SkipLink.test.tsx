import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/renderWithProviders'

import { SkipLink } from './SkipLink'

describe('SkipLink', () => {
  it('targets the main region and is hidden until focused', async () => {
    await renderWithProviders(
      <>
        <SkipLink label="Skip to main content" targetId="main-content" />
        <main id="main-content" tabIndex={-1}>
          Content
        </main>
      </>
    )

    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link).toHaveAttribute('href', '#main-content')
    expect(link.className).toContain('sr-only')
    expect(link.className).toContain('focus:not-sr-only')
  })

  it('moves focus to the target region on activation', async () => {
    const user = userEvent.setup()

    await renderWithProviders(
      <>
        <SkipLink label="Skip to main content" targetId="main-content" />
        <main id="main-content" tabIndex={-1}>
          Content
        </main>
      </>
    )

    await user.click(screen.getByRole('link', { name: 'Skip to main content' }))

    expect(document.getElementById('main-content')).toHaveFocus()
  })
})
