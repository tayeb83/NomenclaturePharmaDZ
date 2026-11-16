'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ALGERIA_WILAYAS } from '@/lib/wilayas'
import { slugify } from '@/lib/slug'

export type ModeRecherche = 'medicament' | 'guidee' | 'garde'

const MODES: Array<{ id: ModeRecherche; icone: string; fr: string; ar: string }> = [
  { id: 'medicament', icone: '🔍', fr: 'Médicament', ar: 'دواء' },
  { id: 'guidee', icone: '🧭', fr: 'Recherche guidée', ar: 'بحث موجَّه' },
  { id: 'garde', icone: '📍', fr: 'Pharmacie de garde', ar: 'صيدلية مناوبة' },
]

/** Sélecteur de mode, identique sur l'accueil et sur /recherche. */
export function ModesRecherche({ mode, onChange, ar, modes, labelledBy }: {
  mode: ModeRecherche
  onChange: (m: ModeRecherche) => void
  ar: boolean
  modes?: ModeRecherche[]
  labelledBy?: string
}) {
  const liste = modes ? MODES.filter(m => modes.includes(m.id)) : MODES
  return (
    <div className="home-seg" role="tablist" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : ar ? 'أنماط البحث' : 'Modes de recherche'}>
      {liste.map(o => (
        <button key={o.id} type="button" role="tab" aria-selected={mode === o.id} className={mode === o.id ? 'actif' : ''} onClick={() => onChange(o.id)}>
          <span aria-hidden>{o.icone}</span> {ar ? o.ar : o.fr}
        </button>
      ))}
    </div>
  )
}

/** Panneau « pharmacie de garde » : près de moi, ou choix d'une wilaya. */
export function PanneauGarde({ ar }: { ar: boolean }) {
  const t = (fr: string, a: string) => (ar ? a : fr)
  const router = useRouter()
  const [wilaya, setWilaya] = useState('')
  return (
    <div className="home-panneau">
      <p><b>{t('Quelle pharmacie est de garde ?', 'أي صيدلية مناوبة؟')}</b> {t('Choisissez votre wilaya ou laissez-nous vous localiser.', 'اختر ولايتك أو دعنا نحدد موقعك.')}</p>
      <div className="home-garde">
        <Link href="/garde" className="home-bouton">📍 {t('Près de moi', 'قربي')}</Link>
        <form className="home-garde-form" onSubmit={e => { e.preventDefault(); if (wilaya) router.push(`/pharmacie-de-garde/${wilaya}`) }}>
          <select value={wilaya} onChange={e => { setWilaya(e.target.value); if (e.target.value) router.push(`/pharmacie-de-garde/${e.target.value}`) }} aria-label={t('Choisir une wilaya', 'اختر ولاية')}>
            <option value="">{t('Choisir une wilaya…', 'اختر ولاية…')}</option>
            {ALGERIA_WILAYAS.map(w => <option key={w.code} value={slugify(w.name_fr)}>{w.code} · {ar ? w.name_ar : w.name_fr}</option>)}
          </select>
        </form>
      </div>
      <Link href="/pharmacie-de-garde" className="home-mode-aide" style={{ display: 'inline-block' }}>{t('Ou choisir une commune →', 'أو اختيار بلدية ←')}</Link>
    </div>
  )
}
