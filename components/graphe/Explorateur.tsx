'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { COUCHES, type GraphData, type GraphNode } from '@/lib/graphe/core'
import { GrapheView } from './GrapheView'
import { TEXTES } from './textes'

type Suggestion = { valeur: string; detail: string }
type Vue = 'substance' | 'classe' | 'laboratoire'
type Mode = 'importation' | 'concentration'

const champ: React.CSSProperties = { font: 'inherit', fontSize: 15.5, padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, background: 'white', width: '100%', boxSizing: 'border-box' }

/** Champ de saisie avec suggestions : tape, choisit dans la liste ou garde sa saisie ; la requête se lance à part. */
function Autocomplete({ id, label, aide, kind, valeur, onChange, desactive = false }: {
  id: string; label: string; aide?: string; kind: Vue; valeur: string; onChange: (v: string) => void; desactive?: boolean
}) {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  const [sugg, setSugg] = useState<Suggestion[]>([])
  const [ouvert, setOuvert] = useState(false)
  const seq = useRef(0)
  const choisi = useRef('')

  useEffect(() => {
    const q = valeur.trim()
    if (desactive || q.length < 2 || q === choisi.current) { setSugg([]); return }
    const n = ++seq.current
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/graphe/explorer?suggere=${kind === 'laboratoire' ? 'labo' : kind}&q=${encodeURIComponent(q)}`)
        const j = await r.json()
        if (n === seq.current) { setSugg(r.ok ? j.results ?? [] : []); setOuvert(true) }
      } catch { if (n === seq.current) setSugg([]) }
    }, 220)
    return () => clearTimeout(timer)
  }, [valeur, kind, desactive])

  return (
    <div style={{ position: 'relative', minWidth: 0 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.brassDark, marginBottom: 4 }}>{label}</label>
      <input id={id} style={{ ...champ, opacity: desactive ? 0.5 : 1 }} value={valeur} disabled={desactive} placeholder={t.chercher} autoComplete="off"
        aria-describedby={aide ? `${id}-aide` : undefined} onChange={e => { choisi.current = ''; onChange(e.target.value) }} onBlur={() => setTimeout(() => setOuvert(false), 150)} onFocus={() => sugg.length && setOuvert(true)} />
      {aide && <div id={`${id}-aide`} style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{aide}</div>}
      {ouvert && sugg.length > 0 && (
        <ul role="listbox" style={{ position: 'absolute', zIndex: 5, insetInline: 0, margin: 0, padding: 4, listStyle: 'none', background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 8px 20px rgba(11,23,48,.15)' }}>
          {sugg.map(s => (
            <li key={s.valeur} role="option" aria-selected="false">
              <button type="button" style={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', padding: '7px 10px', cursor: 'pointer', borderRadius: 6 }}
                onMouseDown={e => e.preventDefault()} onClick={() => { choisi.current = s.valeur; onChange(s.valeur); setSugg([]); setOuvert(false) }}>
                <b>{s.valeur}</b> <span style={{ color: C.muted, fontSize: 13 }}>{s.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Explorateur complet (abonnés). Une requête = une vue (substance, classe ATC ou laboratoire), avec un
 * laboratoire facultatif qui restreint le résultat : « substance + laboratoire ».
 */
export function Explorateur() {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  const uid = useId()
  const [vue, setVue] = useState<Vue>('substance')
  const [mode, setMode] = useState<Mode>('importation')
  const [principal, setPrincipal] = useState('')
  const [labo, setLabo] = useState('')
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [etat, setEtat] = useState<'repos' | 'charge' | 'erreur'>('repos')
  const [message, setMessage] = useState('')

  async function lancer(v: Vue = vue, p: string = principal, l: string = labo, m: Mode = mode) {
    const cible = p.trim()
    if (!cible) return
    setEtat('charge'); setMessage('')
    const q = v === 'substance' ? `vue=substance&substance=${encodeURIComponent(cible)}`
      : v === 'classe' ? `vue=classe&atc=${encodeURIComponent(cible)}&mode=${m}`
      : `vue=laboratoire&labo=${encodeURIComponent(cible)}`
    const filtre = v !== 'laboratoire' && l.trim() && !(v === 'classe' && m === 'concentration') ? `&labo=${encodeURIComponent(l.trim())}` : ''
    try {
      const r = await fetch(`/api/graphe/explorer?${q}${filtre}`)
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setEtat('erreur'); setMessage(j.error || t.aucun); setGraph(null); return }
      setGraph(j.graph); setEtat('repos')
    } catch { setEtat('erreur'); setMessage(t.aucun) }
  }

  /** Recentre sur un nœud du graphe : substance, classe ATC ou laboratoire. */
  function recentrer(n: GraphNode) {
    const v: Vue = n.kind === 'atc' ? 'classe' : n.kind === 'labo' ? 'laboratoire' : 'substance'
    const valeur = n.kind === 'atc' ? n.label.split(' · ')[0] : n.label
    setVue(v); setPrincipal(valeur); setLabo('')
    void lancer(v, valeur, '', mode)
  }

  function changerVue(v: Vue) { setVue(v); setPrincipal(''); setLabo(''); setGraph(null); setEtat('repos'); setMessage('') }

  const bouton = (actif: boolean, couleur: string = C.blueDeep): React.CSSProperties => ({ font: 'inherit', fontSize: 14, fontWeight: 700, padding: '6px 14px', borderRadius: 999, cursor: 'pointer', border: `1.5px solid ${actif ? couleur : '#cbd5e1'}`, background: actif ? couleur : 'white', color: actif ? 'white' : C.muted })
  const concentration = vue === 'classe' && mode === 'concentration'

  return (
    <form dir={lang === 'ar' ? 'rtl' : 'ltr'} onSubmit={e => { e.preventDefault(); void lancer() }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }} role="group" aria-label={t.vue}>
        {(['substance', 'classe', 'laboratoire'] as const).map(v => (
          <button key={v} type="button" aria-pressed={vue === v} style={bouton(vue === v)} onClick={() => changerVue(v)}>{t[v]}</button>
        ))}
        {vue === 'classe' && (['importation', 'concentration'] as const).map(m => (
          <button key={m} type="button" aria-pressed={mode === m} style={bouton(mode === m, C.brass)} onClick={() => setMode(m)}>{t[m]}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, alignItems: 'start', maxWidth: 820 }}>
        <Autocomplete id={`${uid}-p`} kind={vue} label={t[vue]} valeur={principal} onChange={setPrincipal} />
        {vue !== 'laboratoire' && (
          <Autocomplete id={`${uid}-l`} kind="laboratoire" label={t.laboFiltre} aide={concentration ? t.laboConcentration : t.laboAide} valeur={labo} onChange={setLabo} desactive={concentration} />
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '14px 0' }}>
        <button type="submit" disabled={etat === 'charge' || !principal.trim()} style={{ font: 'inherit', fontWeight: 700, padding: '10px 20px', borderRadius: 999, border: `2px solid ${C.brass}`, background: C.navy, color: C.brassLight, cursor: etat === 'charge' || !principal.trim() ? 'not-allowed' : 'pointer', opacity: principal.trim() ? 1 : 0.6 }}>
          {t.lancer}
        </button>
        <span aria-live="polite" style={{ color: etat === 'erreur' ? '#b3261e' : C.muted }}>{etat === 'charge' ? t.chargement : etat === 'erreur' ? message : ''}</span>
      </div>

      {graph && graph.centre.startsWith('substance:') && (
        <p style={{ margin: '0 0 10px' }}>
          <a href={`/api/graphe/pdf?substance=${encodeURIComponent(graph.centre.slice('substance:'.length))}`}
            style={{ display: 'inline-block', font: 'inherit', fontWeight: 700, padding: '8px 16px', borderRadius: 999, border: `2px solid ${C.brass}`, background: C.navy, color: C.brassLight, textDecoration: 'none' }}>
            📄 {t.pdf}
          </a>
          <span style={{ marginInlineStart: 10, fontSize: 13, color: C.muted }}>{t.pdfAide}</span>
        </p>
      )}
      {graph && <GrapheView key={graph.centre + (graph.nodes[0]?.detail ?? '')} graph={graph} couchesInitiales={[...COUCHES]} exportCsv onExplorer={recentrer} />}
    </form>
  )
}
