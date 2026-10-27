'use client'

import { useEffect, useRef, useState } from 'react'
import { CASBAH as C } from '@/lib/garde-ornaments'
import type { Lang } from '@/lib/i18n'
import { TX } from './textes'
import { depuisMarque, type ResultatMarque, type Selection } from './types'

const DISPLAY = 'var(--font-display, Amiri, Georgia, serif)'

type Mode = 'marque' | 'substance'
type SubstanceTrouvee = { dci: string; n: number; classe: boolean }

const presentation = (r: { forme: string | null; dosage: string | null }) => [r.forme, r.dosage].filter(Boolean).join(' · ')

/**
 * Un côté du comparateur : on cherche soit par nom de marque, soit par substance.
 * La saisie est libre ; la sélection reste affichée jusqu'à « Changer ».
 */
export function Choix({ id, titre, valeur, onChoix, lang }: {
  id: string; titre: string; valeur: Selection | null; onChoix: (s: Selection | null) => void; lang: Lang
}) {
  const t = TX[lang]
  const [mode, setMode] = useState<Mode>('marque')
  const [q, setQ] = useState('')
  const [marques, setMarques] = useState<ResultatMarque[]>([])
  const [substances, setSubstances] = useState<SubstanceTrouvee[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(-1)
  const suite = useRef(0)

  useEffect(() => {
    const texte = q.trim()
    if (texte.length < 2) { setMarques([]); setSubstances([]); return }
    const n = ++suite.current
    const h = setTimeout(async () => {
      try {
        const url = mode === 'marque'
          ? `/api/search?${new URLSearchParams({ q: texte, scope: 'enregistrement', activeOnly: '1', limit: '8' })}`
          : `/api/outils/comparateur-medicaments/substances?${new URLSearchParams({ q: texte })}`
        const r = await fetch(url)
        if (!r.ok || n !== suite.current) return
        const json = await r.json()
        if (mode === 'marque') setMarques(Array.isArray(json.results) ? json.results : [])
        else setSubstances(Array.isArray(json.results) ? json.results : [])
        setActif(-1)
      } catch { /* la saisie suivante relancera la recherche */ }
    }, 250)
    return () => clearTimeout(h)
  }, [q, mode])

  const nb = mode === 'marque' ? marques.length : substances.length
  const choisir = (s: Selection) => { onChoix(s); setQ(''); setMarques([]); setSubstances([]); setOuvert(false) }
  const choisirIndex = (i: number) => {
    if (mode === 'marque' && marques[i]) choisir(depuisMarque(marques[i]))
    else if (mode === 'substance' && substances[i]) choisir({ type: 'substance', ...substances[i] })
  }
  const changerMode = (m: Mode) => { setMode(m); setQ(''); setMarques([]); setSubstances([]); setActif(-1) }

  const onglet = (m: Mode, libelle: string) => (
    <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => changerMode(m)}
      style={{ font: 'inherit', fontSize: 13.5, padding: '3px 14px', borderRadius: 999, cursor: 'pointer', border: `1.5px solid ${mode === m ? C.brass : C.creamEdge}`, background: mode === m ? C.navy : 'white', color: mode === m ? C.brassLight : C.navy, fontWeight: mode === m ? 700 : 500 }}>
      {libelle}
    </button>
  )

  return (
    <div style={{ background: 'white', border: `1.5px solid ${C.brass}`, borderRadius: 12, padding: '12px 14px', display: 'grid', gap: 8, alignContent: 'start', minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 700, color: C.brassDark, textTransform: 'uppercase', letterSpacing: '.05em' }}>{titre}</label>
      {valeur ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            {valeur.type === 'marque' ? (
              <>
                <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: C.navy }}>{valeur.nom_marque}</div>
                <div style={{ fontSize: 13.5, color: C.muted }} dir="ltr">{valeur.dci}{presentation(valeur) ? ` — ${presentation(valeur)}` : ''}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.brassDark, textTransform: 'uppercase', letterSpacing: '.05em' }}>{valeur.classe ? t.classeThesaurus : t.parSubstance}</div>
                <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: C.navy }} dir="ltr">{valeur.dci}</div>
                <div style={{ fontSize: 13.5, color: C.muted }}>{valeur.n == null ? '' : valeur.n > 0 ? t.medicamentsN(valeur.n) : t.horsNomenclature}</div>
              </>
            )}
          </div>
          <button type="button" onClick={() => onChoix(null)} style={{ font: 'inherit', fontSize: 13.5, background: 'none', border: `1px solid ${C.creamEdge}`, borderRadius: 999, padding: '3px 12px', cursor: 'pointer', color: C.blue }}>{t.changer}</button>
        </div>
      ) : (
        <>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {onglet('marque', t.parMarque)}
            {onglet('substance', t.parSubstance)}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id={id} type="search" value={q} role="combobox" aria-expanded={ouvert && nb > 0} aria-controls={`${id}-liste`} aria-autocomplete="list"
              autoComplete="off" placeholder={mode === 'marque' ? t.chercherMarque : t.chercherSubstance}
              onChange={e => { setQ(e.target.value); setOuvert(true) }}
              onFocus={() => setOuvert(true)}
              onBlur={() => setTimeout(() => setOuvert(false), 150)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActif(i => Math.min(i + 1, nb - 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActif(i => Math.max(i - 1, 0)) }
                else if (e.key === 'Enter' && actif >= 0) { e.preventDefault(); choisirIndex(actif) }
                else if (e.key === 'Escape') setOuvert(false)
              }}
              style={{ font: 'inherit', fontSize: 15.5, padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, width: '100%', boxSizing: 'border-box' }}
            />
            {ouvert && nb > 0 && (
              <ul id={`${id}-liste`} role="listbox" style={{ position: 'absolute', zIndex: 20, insetInline: 0, top: '100%', margin: '4px 0 0', padding: 0, listStyle: 'none', background: 'white', border: `1.5px solid ${C.brass}`, borderRadius: 10, boxShadow: '0 8px 20px rgba(18,35,63,.18)', maxHeight: 320, overflowY: 'auto' }}>
                {mode === 'marque'
                  ? marques.map((r, i) => (
                    <li key={`${r.source}:${r.id}`} role="option" aria-selected={i === actif}
                      onMouseDown={e => { e.preventDefault(); choisirIndex(i) }}
                      style={{ padding: '8px 12px', cursor: 'pointer', background: i === actif ? C.cream : 'white', borderBottom: `1px solid ${C.creamEdge}` }}>
                      <div style={{ fontWeight: 700, color: C.navy }}>{r.nom_marque}</div>
                      <div style={{ fontSize: 12.5, color: C.muted }} dir="ltr">{r.dci}{presentation(r) ? ` — ${presentation(r)}` : ''}{r.labo ? ` — ${r.labo}` : ''}</div>
                    </li>
                  ))
                  : substances.map((s, i) => (
                    <li key={s.dci} role="option" aria-selected={i === actif}
                      onMouseDown={e => { e.preventDefault(); choisirIndex(i) }}
                      style={{ padding: '8px 12px', cursor: 'pointer', background: i === actif ? C.cream : 'white', borderBottom: `1px solid ${C.creamEdge}` }}>
                      <div style={{ fontWeight: 700, color: C.navy }} dir="ltr">{s.dci}</div>
                      <div style={{ fontSize: 12.5, color: C.muted }}>{s.classe ? `${t.classeThesaurus} · ` : ''}{s.n > 0 ? t.medicamentsN(s.n) : t.horsNomenclature}</div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
