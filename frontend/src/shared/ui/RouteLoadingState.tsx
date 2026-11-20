import { Skeleton } from './Skeleton'

export interface RouteLoadingStateProps {
  heading: string
  busyLabel: string
}

export const RouteLoadingState = ({ heading, busyLabel }: RouteLoadingStateProps) => (
  <div role="status" aria-busy="true" aria-label={busyLabel} className="flex flex-col gap-section">
    <h2 className="text-title text-text">{heading}</h2>
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-10 w-3/5 max-w-md rounded-card" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-4/5 max-w-lg" />
      <Skeleton className="mt-2 h-40 w-full rounded-card" />
      <Skeleton className="h-4 w-2/3 max-w-md" />
    </div>
  </div>
)
