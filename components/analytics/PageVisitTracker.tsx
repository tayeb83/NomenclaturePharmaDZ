'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PageVisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    const payload = {
      page_path: pathname,
      page_title: typeof document !== 'undefined' ? document.title : null,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
    }

    try {
      const body = JSON.stringify(payload)
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/page-visit', blob)
        return
      }

      fetch('/api/analytics/page-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    } catch {
      // analytics non bloquant
    }
  }, [pathname])

  return null
}
