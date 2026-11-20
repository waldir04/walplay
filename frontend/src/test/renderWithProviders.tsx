import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'

import { i18n } from '@/app/i18n'
import type { SupportedLocaleCode } from '@/shared/config/constants'

export interface RenderWithProvidersOptions {
  initialEntries?: string[]
  locale?: SupportedLocaleCode
}

export const renderWithProviders = async (
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
) => {
  await i18n.changeLanguage(options.locale ?? 'en')

  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>{ui}</MemoryRouter>
    </I18nextProvider>
  )
}
