import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import type { InitialEntry } from 'react-router'
import type { QueryClient } from '@tanstack/react-query'

import { i18n } from '@/app/i18n'
import { QueryClientProvider, createQueryClient } from '@/app/providers/QueryClientProvider'
import type { SupportedLocaleCode } from '@/shared/config/constants'

export interface RenderWithProvidersOptions {
  initialEntries?: InitialEntry[]
  locale?: SupportedLocaleCode
  queryClient?: QueryClient
}

export const renderWithProviders = async (
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
) => {
  await i18n.changeLanguage(options.locale ?? 'en')
  const queryClient = options.queryClient ?? createQueryClient()

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  )
}
