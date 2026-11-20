import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { i18n } from '@/app/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'

import { LanguageSwitcher } from './LanguageSwitcher'

describe('LanguageSwitcher', () => {
  it('presents an accessible radio group with endonym labels', async () => {
    await renderWithProviders(
      <LanguageSwitcher groupLabel="Interface language" helperText="Applies immediately." />
    )

    expect(screen.getByRole('group', { name: 'Interface language' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Español' })).not.toBeChecked()
    expect(screen.getByText('Applies immediately.')).toBeInTheDocument()
  })

  it('changes the language and checked state without a reload', async () => {
    const user = userEvent.setup()

    await renderWithProviders(<LanguageSwitcher groupLabel="Interface language" />)
    await user.click(screen.getByRole('radio', { name: 'Español' }))

    await waitFor(() => expect(i18n.language).toBe('es'))
    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked()
  })

  it('supports keyboard selection through native radio behavior', async () => {
    const user = userEvent.setup()

    await renderWithProviders(<LanguageSwitcher groupLabel="Interface language" />)

    await user.tab()
    expect(screen.getByRole('radio', { name: 'English' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked())
  })
})
