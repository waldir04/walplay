import { cn } from '@/shared/lib/cn'

export interface SkeletonProps {
  className?: string
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={cn('rounded-control bg-surface-subtle motion-safe:animate-pulse', className)}
  />
)
