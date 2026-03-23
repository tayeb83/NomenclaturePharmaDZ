'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

type AdBannerProps = {
  slot: string
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
  responsive?: boolean
  style?: React.CSSProperties
}

/**
 * Composant Google AdSense.
 *
 * Usage :
 *   <AdBanner slot="1234567890" format="auto" responsive />
 *
 * Pour activer :
 *   1. Créer un compte Google AdSense sur https://www.google.com/adsense
 *   2. Ajouter votre site et obtenir votre Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
 *   3. Définir NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX dans .env.local
 *   4. Remplacer le slot par l'ID de l'emplacement publicitaire créé dans AdSense
 */
export function AdBanner({ slot, format = 'auto', responsive = true, style }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return
    try {
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
      }
    } catch {
      // AdSense non chargé
    }
  }, [clientId])

  // Si pas de client ID configuré → afficher un placeholder en dev
  if (!clientId) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '16px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.65)',
          fontSize: 12,
          ...style,
        }}>
          📢 Emplacement publicitaire AdSense<br />
          <span style={{ fontSize: 10 }}>Configurer NEXT_PUBLIC_ADSENSE_CLIENT_ID</span>
        </div>
      )
    }
    return null
  }

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: 'block', ...(style || {}) }}
      data-ad-client={clientId}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  )
}

/**
 * Bannière publicitaire horizontale — à placer entre les sections de contenu.
 */
export function AdHorizontal({ slot }: { slot: string }) {
  return (
    <div style={{ margin: '24px 0', overflow: 'hidden' }}>
      <AdBanner slot={slot} format="horizontal" responsive style={{ minHeight: 90 }} />
    </div>
  )
}

/**
 * Pub rectangle — à placer dans une sidebar ou colonne.
 */
export function AdRectangle({ slot }: { slot: string }) {
  return (
    <div style={{ margin: '16px 0' }}>
      <AdBanner slot={slot} format="rectangle" style={{ minHeight: 250, minWidth: 300 }} />
    </div>
  )
}
