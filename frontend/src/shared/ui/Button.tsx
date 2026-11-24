import type { ComponentPropsWithRef } from 'react'

import { cn } from '@/shared/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'min-h-11 bg-primary px-4 py-2.5 font-semibold text-text-inverse hover:bg-primary-strong',
  secondary:
    'min-h-11 border border-border-strong bg-surface px-4 py-2.5 font-semibold text-text hover:bg-surface-raised',
  ghost: 'min-h-9 min-w-9 text-primary hover:bg-surface-raised',
}

export const Button = ({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={cn(
      'inline-flex cursor-pointer items-center justify-center gap-2 rounded-control transition-colors duration-150 ease-out motion-reduce:transition-none hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60',
      variantClasses[variant],
      className
    )}
    {...props}
  />
)
