import { cn } from '@/shared/lib/cn'

export const WALPLAY_MONOGRAM_PATH = 'M5 10 L11 22 L16 13 L21 22 L27 10'

export interface WalplayLogoProps {
  className?: string
  showText?: boolean
}

export const WalplayLogo = ({ className, showText = true }: WalplayLogoProps) => (
  <span className={cn('inline-flex select-none items-center gap-2.5', className)}>
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-primary"
    >
      <path d={WALPLAY_MONOGRAM_PATH} />
    </svg>
    {showText ? (
      <span className="text-xl font-semibold tracking-tight text-text">Walplay</span>
    ) : null}
  </span>
)
