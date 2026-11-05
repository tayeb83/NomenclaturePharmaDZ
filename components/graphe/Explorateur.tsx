'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { COUCHES, type GraphData, type GraphNode } from '@/lib/graphe/core'
import { GrapheView } from './GrapheView'
import { TEXTES } from './textes'

type Suggestion = { valeur: string; detail: string }
const champ: React.CSSProperties = { font: 'inherit', fontSize: 15.5, padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, background: 'white', width: '100%', boxSizing: 'border-box' }

/** Explorateur complet (abonnés) : n'importe quelle substance ou classe ATC. */
export function Explorateur() {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  const [vue, setVue] = useState<'substance' | 'classe'>('substance')
  const [mode, setMode] = useState<'importation' | 'concentration'>('importation')
  const [saisie, setSaisie] = useState('')
  const [choix, setChoix] = useState('')
  const [sugg, setSugg] = useState<Suggestion[]>([])
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [etat, setEtat] = useState<'repos' | 'charge' | 'erreur'>('repos')
  const [message, setMessage] = useState('')
  const seq = useRef(0)

  useEffect(() => {
    const q = saisie.trim()
    if (q.length < 2 || q === choix) { setSugg([]); return }
    const n = ++seq.current
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/graphe/explorer?suggere=${vue}&q=${encodeURIComponent(q)}`)
        const j = await r.json()
        if (n === seq.current) setSugg(r.ok ? j.results ?? [] : [])
      } catch { if (n === seq.current) setSugg([]) }
    }, 220)
    return () => clearTimeout(id)
  }, [saisie, vue, choix])

  async function afficher(valeur: string) {
    setEtat('charge'); setMessage('')
    const q = vue === 'substance' ? `vue=substance&substance=${encodeURIComponent(valeur)}` : `vue=classe&atc=${encodeURIComponent(valeur)}&mode=${mode}`
    try {
      const r = await fetch(`/api/graphe/explorer?${q}`)
      const j = await r.json()
      if (!r.ok) { setEtat('erreur'); setMessage(j.error || t.aucun); setGraph(null); return }
      setGraph(j.graph); setEtat('repos')
    } catch { setEtat('erreur'); setMessage(t.aucun) }
  }

  const bouton = (actif: boolean): React.CSSProperties => ({ font: 'inherit', fontSize: 14, fontWeight: 700, padding: '6px 14px', borderRadius: 999, cursor: 'pointer', border: `1.5px solid ${actif ? C.blueDeep : '#cbd5e1'}`, background: actif ? C.blueDeep : 'white', color: actif ? 'white' : C.muted })

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }} role="group" aria-label={t.vue}>
        <button type="button" aria-pressed={vue === 'substance'} style={bouton(vue === 'substance')} onClick={() => { setVue('substance'); setSaisie(''); setChoix(''); setGraph(null) }}>{t.substance}</button>
        <button type="button" aria-pressed={vue === 'classe'} style={bouton(vue === 'classe')} onClick={() => { setVue('classe'); setSaisie(''); setChoix(''); setGraph(null) }}>{t.classe}</button>
        {vue === 'classe' && (['importation', 'concentration'] as const).map(m => (
          <button key={m} type="button" aria-pressed={mode === m} style={{ ...bouton(mode === m), borderColor: mode === m ? C.brass : '#cbd5e1', background: mode === m ? C.brass : 'white' }} onClick={() => { setMode(m); if (choix) void afficherAvec(m) }}>{t[m]}</button>
        ))}
      </div>
      <div style={{ position: 'relative', maxWidth: 520 }}>
        <input style={champ} value={saisie} placeholder={t.chercher} aria-label={vue === 'substance' ? t.substance : t.classe}
          onChange={e => { setSaisie(e.target.value); setChoix('') }}
          onKeyDown={e => { if (e.key === 'Enter' && saisie.trim()) { e.preventDefault(); setChoix(saisie.trim()); setSugg([]); void afficher(saisie.trim()) } }} />
        {sugg.length > 0 && (
          <ul role="listbox" style={{ position: 'absolute', zIndex: 5, insetInline: 0, margin: 0, padding: 4, listStyle: 'none', background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 8px 20px rgba(11,23,48,.15)' }}>
            {sugg.map(s => (
              <li key={s.valeur} role="option" aria-selected="false">
                <button type="button" style={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', padding: '7px 10px', cursor: 'pointer', borderRadius: 6 }}
                  onClick={() => { setSaisie(s.valeur); setChoix(s.valeur); setSugg([]); void afficher(s.valeur) }}>
                  <b>{s.valeur}</b> <span style={{ color: C.muted, fontSize: 13 }}>{s.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div aria-live="polite" style={{ minHeight: 24, margin: '10px 0', color: etat === 'erreur' ? '#b3261e' : C.muted }}>
        {etat === 'charge' ? t.chargement : etat === 'erreur' ? message : ''}
      </div>
      {graph && vue === 'substance' && graph.centre.startsWith('substance:') && (
        <p style={{ margin: '0 0 10px' }}>
          <a href={`/api/graphe/pdf?substance=${encodeURIComponent(graph.centre.slice('substance:'.length))}`}
            style={{ display: 'inline-block', font: 'inherit', fontWeight: 700, padding: '8px 16px', borderRadius: 999, border: `2px solid ${C.brass}`, background: C.navy, color: C.brassLight, textDecoration: 'none' }}>
            📄 {t.pdf}
          </a>
          <span style={{ marginInlineStart: 10, fontSize: 13, color: C.muted }}>{t.pdfAide}</span>
        </p>
      )}
      {graph && <GrapheView key={graph.centre} graph={graph} couchesInitiales={[...COUCHES]} exportCsv onExplorer={recentrer} />}
    </div>
  )

  /** Recentre sur un nœud : une substance (la DCI) ou une classe ATC (le code, déjà dans le libellé). */
  function recentrer(n: GraphNode) {
    const valeur = n.kind === 'atc' ? n.label.split(' · ')[0] : n.label
    const v = n.kind === 'atc' ? 'classe' : 'substance'
    setVue(v); setSaisie(valeur); setChoix(valeur); setSugg([])
    setEtat('charge'); setMessage('')
    const q = v === 'substance' ? `vue=substance&substance=${encodeURIComponent(valeur)}` : `vue=classe&atc=${encodeURIComponent(valeur)}&mode=${mode}`
    fetch(`/api/graphe/explorer?${q}`).then(async r => {
      const j = await r.json().catch(() => ({}))
      if (r.ok) { setGraph(j.graph); setEtat('repos') } else { setEtat('erreur'); setMessage(j.error || t.aucun) }
    }).catch(() => { setEtat('erreur'); setMessage(t.aucun) })
  }

  async function afficherAvec(m: 'importation' | 'concentration') {
    setEtat('charge')
    try {
      const r = await fetch(`/api/graphe/explorer?vue=classe&atc=${encodeURIComponent(choix)}&mode=${m}`)
      const j = await r.json()
      if (r.ok) { setGraph(j.graph); setEtat('repos') } else { setEtat('erreur'); setMessage(j.error || t.aucun) }
    } catch { setEtat('erreur'); setMessage(t.aucun) }
  }
}
