'use client'

import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/i18n'
import type { SearchHit } from '@/lib/annuaire'
import { displayName, pharmacyPath } from '@/lib/annuaire-types'
import { labels } from './labels'

/** Recherche globale (nom, quartier, commune, wilaya) depuis la page d'accueil de l'annuaire. */
export function HubSearch({ lang }: { lang: Lang }) {
  const t = labels(lang)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)

  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return }
    const ctrl = new AbortController()
    const id = window.setTimeout(() => {
      fetch(`/api/annuaire/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal })
        .then(r => (r.ok ? r.json() : { data: [] }))
        .then(j => setHits(j.data || []))
        .catch(() => {})
    }, 250)
    return () => { window.clearTimeout(id); ctrl.abort() }
  }, [q])

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="an-bar" style={{ gridTemplateColumns: '1fr' }} role="search">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} autoComplete="off"
          placeholder={t.globalSearchPh} aria-label={t.search} />
      </div>
      {hits && (
        <div className="an-list" style={{ gap: 8 }}>
          {hits.length === 0 && <div className="alert-banner info">{t.globalNoHit}</div>}
          {hits.map(h => (
            <a key={h.id} className="an-hit" href={pharmacyPath(h, lang)}>
              <strong>{displayName(h, lang)}</strong> {h.verified && <span className="an-pill verified">✓ {t.verified}</span>}
              <span>
                {lang === 'ar' ? h.commune_name_ar || h.commune_name_fr : h.commune_name_fr}
                {' · '}
                {lang === 'ar' ? h.wilaya_name_ar || h.wilaya_name_fr : h.wilaya_name_fr}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
