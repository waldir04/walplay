import { useEffect, useState } from 'react'

export interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive'
}

export const LiveRegion = ({ message, politeness = 'polite' }: LiveRegionProps) => {
  const [visibleMessage, setVisibleMessage] = useState('')

  useEffect(() => {
    if (message.length === 0) {
      setVisibleMessage('')
      return
    }

    setVisibleMessage('')
    const timer = setTimeout(() => setVisibleMessage(message), 0)
    return () => clearTimeout(timer)
  }, [message])

  return (
    <div
      aria-live={politeness}
      role={politeness === 'assertive' ? 'alert' : 'status'}
      className="sr-only"
    >
      {visibleMessage}
    </div>
  )
}
