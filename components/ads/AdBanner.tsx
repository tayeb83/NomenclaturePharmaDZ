'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

/**
 * Emplacement par défaut. Permet d'ajouter une publicité sur n'importe quelle
 * page sans avoir à créer un bloc AdSense dédié : on retombe sur l'emplacement
 * « contenu » générique, puis sur l'emplacement historique.
 * (Les variables NEXT_PUBLIC_* doivent être référencées statiquement pour être
 * injectées au build — d'où l'écriture explicite ci-dessous.)
 */
const DEFAULT_SLOT =
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ||
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_MEDICAMENTS ||
  ''

type AdBannerProps = {
  /** Identifiant du bloc AdSense. Par défaut : l'emplacement « contenu ». */
  slot?: string
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
  const pushedRef = useRef(false)
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const adSlot = slot || DEFAULT_SLOT

  useEffect(() => {
    if (!clientId || !adSlot) return
    // Une seule demande de remplissage par <ins>. Sans ce garde-fou, un
    // remontage (StrictMode) ou un re-rendu pousse plusieurs fois pour le même
    // emplacement et AdSense rejette le lot entier — « All ins elements
    // already have ads in them » — ce qui fait disparaître les pubs de toute
    // la page dès qu'il y en a plusieurs.
    if (pushedRef.current) return
    if (adRef.current?.getAttribute('data-adsbygoogle-status')) return

    try {
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
        pushedRef.current = true
      }
    } catch {
      // AdSense non chargé
    }
  }, [clientId, adSlot])

  // Sans client ID ou sans emplacement configuré → placeholder en dev
  if (!clientId || !adSlot) {
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
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  )
}

/**
 * Bannière publicitaire horizontale — à placer entre les sections de contenu.
 */
export function AdHorizontal({ slot }: { slot?: string }) {
  return (
    <div style={{ margin: '24px 0', overflow: 'hidden' }}>
      <AdBanner slot={slot} format="horizontal" responsive style={{ minHeight: 90 }} />
    </div>
  )
}

/**
 * Pub rectangle — à placer dans une sidebar ou colonne.
 */
export function AdRectangle({ slot }: { slot?: string }) {
  return (
    <div style={{ margin: '16px 0' }}>
      <AdBanner slot={slot} format="rectangle" style={{ minHeight: 250, minWidth: 300 }} />
    </div>
  )
}

/**
 * Publicité intégrée au contenu, prête à l'emploi et sans configuration :
 * elle utilise l'emplacement « contenu » par défaut. C'est le composant à
 * poser dans les pages de contenu (fiches, listes, articles).
 *
 * Elle ne rend rien si AdSense n'est pas configuré, et se centre dans la
 * largeur du contenu pour rester lisible sur mobile.
 */
export function AdInContent({ slot, style }: { slot?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ margin: '28px auto', maxWidth: 960, overflow: 'hidden', ...style }}>
      <AdBanner slot={slot} format="auto" responsive style={{ minHeight: 100 }} />
    </div>
  )
}
