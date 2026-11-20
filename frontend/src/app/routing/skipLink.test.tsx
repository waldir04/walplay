import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { installMatchMediaMock } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

describe('skip link', () => {
  it('is the first Tab stop and moves focus to the main region', async () => {
    installMatchMediaMock(false)
    const user = userEvent.setup()
    renderApp(['/'])

    await screen.findByRole('heading', { level: 1 })

    await user.tab()
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveFocus()

    await user.keyboard('{Enter}')

    const main = screen.getByRole('main')
    expect(main).toHaveFocus()
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')
  })
})
