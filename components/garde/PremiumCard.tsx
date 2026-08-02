'use client'

import { useEffect } from 'react'
import type { GardeShift } from '@/lib/db-types'

/**
 * Rendu de la « Fiche Pharmacie Premium » (offre /pro) dans les pages de
 * garde : badge « Vérifiée », accroche, horaires détaillés, photos et
 * WhatsApp cliquable. Les champs viennent de garde_pharmacy_premium et
 * sont absents tant que l'abonnement n'est pas actif — chaque bloc se
 * masque donc tout seul.
 */

type Lang = 'fr' | 'ar'

export function isPremium(shift: GardeShift): boolean {
  return shift.is_premium === true
}

/** Style de la carte mise en avant, à fusionner avec celui de la carte normale. */
export const premiumCardStyle: React.CSSProperties = {
  border: '1px solid #fcd34d',
  background: 'linear-gradient(180deg, #fffdf5 0%, #ffffff 60%)',
  boxShadow: '0 1px 3px rgba(180,83,9,0.10)',
}

export function PremiumBadges({ shift, lang }: { shift: GardeShift; lang: Lang }) {
  if (!isPremium(shift)) return null
  return (
    <span style={{ display: 'inline-flex', gap: 6, marginInlineStart: 8, verticalAlign: 'middle' }}>
      {shift.premium_verified && (
        <span className="badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
          ✅ {lang === 'ar' ? 'موثّقة' : 'Vérifiée'}
        </span>
      )}
    </span>
  )
}

export function PremiumDetails({ shift, lang }: { shift: GardeShift; lang: Lang }) {
  if (!isPremium(shift)) return null

  const highlight = lang === 'ar'
    ? shift.highlight_ar || shift.highlight_fr
    : shift.highlight_fr || shift.highlight_ar
  const hours = lang === 'ar'
    ? shift.hours_ar || shift.hours_fr
    : shift.hours_fr || shift.hours_ar
  const photos = Array.isArray(shift.photos) ? shift.photos : []

  if (!highlight && !hours && photos.length === 0) return null

  return (
    <>
      {highlight && (
        <div style={{ fontSize: 13, color: '#92400e', marginTop: 6, fontWeight: 600 }}>{highlight}</div>
      )}
      {hours && (
        <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 4 }}>
          🕘 {hours}
        </div>
      )}
      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {photos.map((photo, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={i}
              src={photo.url}
              alt={photo.caption || ''}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{
                height: 96, width: 'auto', maxWidth: 180, objectFit: 'cover',
                borderRadius: 8, border: '1px solid var(--slate-200)', flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}

export function WhatsAppButton({ shift, lang }: { shift: GardeShift; lang: Lang }) {
  if (!isPremium(shift) || !shift.whatsapp_e164) return null

  const number = shift.whatsapp_e164.replace(/\D/g, '')
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        background: '#25D366', color: '#fff', borderRadius: 8, padding: '8px 14px',
        fontSize: 13, fontWeight: 700, textDecoration: 'none',
      }}
    >
      💬 {lang === 'ar' ? 'واتساب' : 'WhatsApp'}
    </a>
  )
}

/**
 * Compte une consultation de fiche premium, une fois par session et par
 * pharmacie — c'est la statistique vendue au pharmacien. Aucun identifiant
 * visiteur n'est transmis.
 */
export function usePremiumViews(shifts: GardeShift[], wilayaCode: string) {
  // Les fiches affichées changent d'identité à chaque rendu : on ne
  // redéclenche que si la liste des pharmacies premium change vraiment.
  const ids = shifts.filter(isPremium).map(s => s.pharmacy_id).filter(Boolean).join(',')

  useEffect(() => {
    if (!ids || !wilayaCode) return

    for (const externalId of ids.split(',')) {
      const key = `garde-view:${wilayaCode}:${externalId}`
      try {
        if (window.sessionStorage.getItem(key)) continue
        window.sessionStorage.setItem(key, '1')
      } catch {
        // Navigation privée : on compte quand même, sans dédoublonner.
      }

      fetch('/api/garde/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wilaya_code: wilayaCode, pharmacy_external_id: externalId }),
        keepalive: true,
      }).catch(() => {})
    }
  }, [ids, wilayaCode])
}
