import './styles/index.css'

import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'

import { App } from './App'
import { AppConfigError } from './AppConfigError'
import './i18n'
import { parseConfig } from '@/shared/config/env'
import type { EnvSource } from '@/shared/config/env'

export const bootstrap = (container: HTMLElement, source?: EnvSource): Root => {
  const root = createRoot(container)
  const configResult = parseConfig(source)

  if (configResult.status === 'invalid-required') {
    root.render(<AppConfigError />)
    return root
  }

  root.render(<App />)
  return root
}

const rootContainer = typeof document === 'undefined' ? null : document.getElementById('root')

if (rootContainer) {
  bootstrap(rootContainer)
}
