'use client'

import { useEffect, useRef, useState } from 'react'

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

/**
 * Emplacements nommés : un bloc AdSense par position dans la page, pour que
 * les rapports AdSense (« Blocs d'annonces ») disent quelle position rapporte.
 * Tant qu'une variable n'est pas définie, la position retombe sur
 * l'emplacement par défaut : rien ne casse, mais tout est compté ensemble.
 *
 *   top     — juste après l'essentiel de la page (haut de fiche)
 *   list    — intercalé dans une liste de résultats
 *   sidebar — colonne latérale collante (ordinateur uniquement)
 *   bottom  — bas de page
 */
export type AdPlacement = 'top' | 'list' | 'sidebar' | 'bottom'

const PLACEMENT_SLOTS: Record<AdPlacement, string | undefined> = {
  top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP,
  list: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LIST,
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
  bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM,
}

type AdBannerProps = {
  /** Identifiant explicite du bloc AdSense (prioritaire sur `placement`). */
  slot?: string
  /** Position dans la page : choisit le bloc AdSense dédié s'il est configuré. */
  placement?: AdPlacement
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
export function AdBanner({ slot, placement, format = 'auto', responsive = true, style }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const adSlot = slot || (placement && PLACEMENT_SLOTS[placement]) || DEFAULT_SLOT

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
 * Publicité intégrée au contenu, prête à l'emploi et sans configuration.
 * C'est le composant à poser dans les pages de contenu (fiches, listes,
 * articles). Sans `placement`, elle est comptée comme « bas de page », la
 * position de la plupart des appels existants.
 *
 * Elle ne rend rien si AdSense n'est pas configuré, et se centre dans la
 * largeur du contenu pour rester lisible sur mobile.
 */
export function AdInContent({ slot, placement = 'bottom', style }: { slot?: string; placement?: AdPlacement; style?: React.CSSProperties }) {
  return (
    <div data-pub={placement} style={{ margin: '28px auto', maxWidth: 960, overflow: 'hidden', ...style }}>
      <AdBanner slot={slot} placement={placement} format="auto" responsive style={{ minHeight: 100 }} />
    </div>
  )
}

/** Écran assez large pour la mise en page à deux colonnes des fiches. */
const SIDEBAR_QUERY = '(min-width: 861px)'
/** Hauteur réservée au bloc (rectangle 250 px), espacement et marges compris. */
const SIDEBAR_HAUTEUR = 250 + 14 + 24

/**
 * Pub de colonne latérale, sur ordinateur uniquement, et seulement si elle
 * tient dans la fenêtre avec le reste de la colonne collante : une colonne
 * plus haute que l'écran laisserait la pub coupée, donc jamais « visible ».
 *
 * Le bloc n'est monté qu'après cette vérification : un <ins> masqué en CSS
 * déclencherait quand même une demande d'annonce (erreur « availableWidth=0 »
 * et impression non visible), ce qu'AdSense pénalise.
 */
export function AdSidebar({ slot }: { slot?: string }) {
  const ancre = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Décidé une fois au montage : démonter un bloc déjà rempli au
    // redimensionnement gaspillerait l'impression.
    const colonne = ancre.current?.parentElement
    if (!colonne || !window.matchMedia(SIDEBAR_QUERY).matches) return
    setVisible(colonne.offsetHeight + SIDEBAR_HAUTEUR <= window.innerHeight)
  }, [])

  // Ancre masquée (hors flux) : sert seulement à mesurer la colonne parente.
  if (!visible) return <div ref={ancre} hidden />
  return (
    <div data-pub="sidebar" className="pub-cote" style={{ overflow: 'hidden' }}>
      <AdBanner slot={slot} placement="sidebar" format="rectangle" responsive={false} style={{ minHeight: 250 }} />
    </div>
  )
}
