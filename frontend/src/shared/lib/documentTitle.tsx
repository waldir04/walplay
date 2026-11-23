import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface DocumentTitleContextValue {
  readonly override: string | null
  readonly setOverride: (value: string | null) => void
}

const DocumentTitleContext = createContext<DocumentTitleContextValue | null>(null)

const NOOP: DocumentTitleContextValue = Object.freeze({
  override: null,
  setOverride: () => undefined,
})

export const DocumentTitleProvider = ({ children }: { readonly children: ReactNode }) => {
  const [override, setOverride] = useState<string | null>(null)
  const value = useMemo(() => ({ override, setOverride }), [override])

  return <DocumentTitleContext.Provider value={value}>{children}</DocumentTitleContext.Provider>
}

export const useDocumentTitleOverride = (): DocumentTitleContextValue =>
  useContext(DocumentTitleContext) ?? NOOP
