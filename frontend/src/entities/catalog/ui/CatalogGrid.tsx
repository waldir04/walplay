import type { ReactNode } from 'react'

export interface CatalogGridProps {
  readonly label: string
  readonly children: ReactNode
}

export const CatalogGrid = ({ label, children }: CatalogGridProps) => (
  <ul
    aria-label={label}
    className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
  >
    {children}
  </ul>
)
