'use client'

import { useEffect, useState } from 'react'
import { CASBAH } from '@/lib/garde-ornaments'
import { shareLinks } from '@/lib/medicament-share'
import type { Lang } from '@/lib/i18n'

type Props = {
  /** adresse absolue de la fiche */
  url: string
  /** message prêt à poster (voir shareMessage) */
  text: string
  /** titre de la fiche, pour le partage natif du téléphone */
  title: string
  lang: Lang
}

const T = {
  fr: { titre: 'Partager cette fiche', copier: 'Copier le lien', copie: 'Lien copié', natif: 'Partager…', fb: 'Facebook', x: 'X (Twitter)', wa: 'WhatsApp' },
  ar: { titre: 'شارك هذه البطاقة', copier: 'نسخ الرابط', copie: 'تم نسخ الرابط', natif: 'مشاركة…', fb: 'فيسبوك', x: 'إكس (تويتر)', wa: 'واتساب' },
} as const

const bouton: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999,
  border: `1.5px solid ${CASBAH.brass}`, background: CASBAH.cream, color: CASBAH.ink,
  fontSize: 13, fontWeight: 700, lineHeight: 1.3, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit',
}

function Icone({ d }: { d: string }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill={CASBAH.blueDeep} aria-hidden="true"><path d={d} /></svg>
}

const ICONES = {
  fb: 'M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5h1.7V3.7c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.2H7.7V13h2.7v8h3.1z',
  x: 'M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.3 4.7H5.5l11.2 14.5z',
  wa: 'M12 2.5a9.4 9.4 0 0 0-8 14.3L2.6 21.5l4.8-1.3A9.4 9.4 0 1 0 12 2.5zm5.3 13.3c-.2.6-1.300 1.200-1.800 1.200-.5.100-1.100.100-1.800-.100-.4-.100-.9-.300-1.600-.600-2.800-1.200-4.600-4-4.700-4.200-.100-.200-1.100-1.500-1.100-2.800s.7-2 1-2.300c.2-.3.500-.3.700-.3h.5c.2 0 .4 0 .6.500l.8 2c.1.200.1.300 0 .5l-.3.500-.4.400c-.1.200-.3.300-.1.600.2.300.7 1.200 1.500 1.900 1 .9 1.900 1.200 2.200 1.300.3.100.5.100.6-.1l.9-1.100c.2-.2.400-.2.600-.1l1.900.9c.3.100.5.200.5.300.1.300.1.800-.1 1.400z',
  lien: 'M10.6 13.4a1 1 0 0 1 0-1.400l3-3a1 1 0 1 1 1.400 1.400l-3 3a1 1 0 0 1-1.400 0zM8.5 17.5a3.500 3.500 0 0 1 0-5l2-2 1.400 1.400-2 2a1.500 1.500 0 0 0 2.100 2.100l2-2 1.400 1.400-2 2a3.500 3.500 0 0 1-4.900.1zM13.100 8.100l2-2a3.500 3.500 0 0 1 5 5l-2 2-1.400-1.400 2-2a1.500 1.500 0 0 0-2.100-2.100l-2 2-1.500-1.500z',
  natif: 'M18 16.1c-.8 0-1.500.3-2 .8l-7.100-4.200a3.200 3.200 0 0 0 0-1.400L16 7.200A3 3 0 1 0 15 5a3 3 0 0 0 .1.700L8 9.900a3 3 0 1 0 0 4.200l7.100 4.200c0 .2-.1.500-.1.700a3 3 0 1 0 3-2.900z',
} as const

export default function ShareBar({ url, text, title, lang }: Props) {
  const t = T[lang]
  const liens = shareLinks(url, text)
  const [copie, setCopie] = useState(false)
  const [natif, setNatif] = useState(false)
  useEffect(() => { setNatif(typeof navigator !== 'undefined' && typeof navigator.share === 'function') }, [])

  async function copier() {
    try {
      await navigator.clipboard.writeText(url)
      setCopie(true)
      setTimeout(() => setCopie(false), 2200)
    } catch { /* presse-papiers refusé : le lien reste copiable depuis la barre d'adresse */ }
  }

  async function partagerNatif() {
    try { await navigator.share({ title, text, url }) } catch { /* annulé par l'utilisateur */ }
  }

  const lien = (href: string, label: string, icone: keyof typeof ICONES) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={bouton} aria-label={`${t.titre} — ${label}`}>
      <Icone d={ICONES[icone]} />{label}
    </a>
  )

  return (
    <div
      role="group" aria-label={t.titre}
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '0 0 16px', padding: '9px 12px',
        border: `1px solid ${CASBAH.creamEdge}`, borderRadius: 12, background: '#fffdf6',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: CASBAH.brassDark, marginInlineEnd: 4 }}>{t.titre}</span>
      {lien(liens.facebook, t.fb, 'fb')}
      {lien(liens.x, t.x, 'x')}
      {lien(liens.whatsapp, t.wa, 'wa')}
      <button type="button" onClick={copier} style={bouton} aria-live="polite">
        <Icone d={ICONES.lien} />{copie ? t.copie : t.copier}
      </button>
      {natif && (
        <button type="button" onClick={partagerNatif} style={bouton}>
          <Icone d={ICONES.natif} />{t.natif}
        </button>
      )}
    </div>
  )
}
