import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { bootstrap } from './main'

describe('bootstrap', () => {
  it('renders the resolved route heading with valid configuration', async () => {
    const container = document.createElement('div')
    document.body.append(container)

    const root = bootstrap(container, { VITE_APP_ENV: 'local', VITE_APP_VERSION: '1.0.0' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome to Walplay' })
    ).toBeInTheDocument()

    const content = container.textContent ?? ''
    expect(content).not.toContain('local')
    expect(content).not.toContain('1.0.0')

    act(() => root.unmount())
    container.remove()
  })
})
