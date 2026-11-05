'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { abreger, coucheDe, COUCHES, disposer, enCsv, filtrerCouches, type Couche, type GraphData, type GraphNode, type NodeKind } from '@/lib/graphe/core'

const W = 700
const H = 540

const COULEUR: Record<NodeKind, string> = {
  substance: C.blueDeep, atc: C.brass, labo: C.teal, pays: '#6b7894', interaction: '#b3261e', classe: '#8e3b7a', retrait: '#5a4a42',
}
const COULEUR_LOCAL = '#2f8f4e'
const GRAVITE_STYLE: Record<string, { c: string; w: number; dash?: string }> = {
  contre_indication: { c: '#b3261e', w: 3.4 },
  deconseillee: { c: '#d9730d', w: 2.8 },
  precaution_emploi: { c: '#b98425', w: 2.2, dash: '6 4' },
  a_prendre_en_compte: { c: '#8a94a8', w: 1.6, dash: '2 4' },
}

const T = {
  fr: {
    couches: { atc: 'Classe ATC', labos: 'Laboratoires', pays: 'Pays', interactions: 'Interactions', retraits: 'Retraits' },
    kinds: { substance: 'Substance', atc: 'Classe ATC', labo: 'Laboratoire', pays: 'Pays d\'origine', interaction: 'Substance en interaction', classe: 'Classe en interaction', retrait: 'Retrait' },
    local: 'production algérienne',
    gravites: { contre_indication: 'Contre-indication', deconseillee: 'Association déconseillée', precaution_emploi: 'Précaution d\'emploi', a_prendre_en_compte: 'À prendre en compte' },
    legendeGravite: 'Gravité de l\'interaction',
    choisir: 'Survolez ou sélectionnez un nœud pour voir son détail.',
    liste: 'Voir les liens sous forme de tableau',
    relation: 'Relation', de: 'De', vers: 'Vers',
    relations: { classe: 'est classée dans', fabrique: 'est fabriquée par', origine: 'provient de', interagit: 'interagit avec', retire: 'a fait l\'objet du retrait', contient: 'contient', vend: 'commercialise' },
    inverses: { classe: 'contient la substance', fabrique: 'fabrique', origine: 'est l\'origine de', interagit: 'interagit avec', retire: 'concerne la substance', contient: 'fait partie de', vend: 'est commercialisée par' },
    tronque: 'Aperçu limité aux nœuds les plus importants de chaque type.',
    csv: 'Exporter les liens (CSV)', demo: 'DÉMO', filtrer: 'Afficher',
    ouvrir: 'Ouvrir la page', recentrer: 'Explorer ce nœud', astuce: 'Cliquez deux fois sur un nœud marqué ↗ pour ouvrir sa page.', ouvrable: 'page disponible',
    graphe: 'Graphe',
  },
  ar: {
    couches: { atc: 'الصنف ATC', labos: 'المخابر', pays: 'البلدان', interactions: 'التداخلات', retraits: 'السحب' },
    kinds: { substance: 'مادة فعالة', atc: 'صنف ATC', labo: 'مخبر', pays: 'بلد المنشأ', interaction: 'مادة متداخلة', classe: 'صنف متداخل', retrait: 'سحب' },
    local: 'إنتاج جزائري',
    gravites: { contre_indication: 'مانع استعمال', deconseillee: 'اقتران غير مستحسن', precaution_emploi: 'احتياط عند الاستعمال', a_prendre_en_compte: 'يؤخذ بعين الاعتبار' },
    legendeGravite: 'درجة خطورة التداخل',
    choisir: 'مرّر المؤشر أو اختر عقدة لعرض تفاصيلها.',
    liste: 'عرض الروابط في جدول',
    relation: 'العلاقة', de: 'من', vers: 'إلى',
    relations: { classe: 'مصنفة ضمن', fabrique: 'تصنعها', origine: 'منشؤها', interagit: 'تتداخل مع', retire: 'شملها سحب', contient: 'تحتوي', vend: 'تسوّق' },
    inverses: { classe: 'تضم المادة', fabrique: 'تصنع', origine: 'هو منشأ', interagit: 'تتداخل مع', retire: 'يخص المادة', contient: 'جزء من', vend: 'تسوّقها' },
    tronque: 'العرض محدود في أهم العقد من كل نوع.',
    csv: 'تصدير الروابط (CSV)', demo: 'عرض تجريبي', filtrer: 'عرض',
    ouvrir: 'افتح الصفحة', recentrer: 'استكشف هذه العقدة', astuce: 'انقر مرتين على عقدة تحمل ↗ لفتح صفحتها.', ouvrable: 'صفحة متاحة',
    graphe: 'الرسم',
  },
} as const

const stats: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, margin: '14px 0 0' }

/**
 * Graphe en étoile (SVG, sans bibliothèque). Les nœuds sont atteignables au clavier ; un tableau des liens
 * accompagne le dessin pour les lecteurs d'écran.
 */
export function GrapheView({ graph, couchesInitiales, demo = false, exportCsv = false, onExplorer }: {
  graph: GraphData
  couchesInitiales: Couche[]
  demo?: boolean
  exportCsv?: boolean
  /** abonnés : recentre l'explorateur sur une substance ou une classe ATC (valeur = DCI ou code) */
  onExplorer?: (n: GraphNode) => void
}) {
  const router = useRouter()
  const { lang } = useLanguage()
  const t = T[lang]
  const ar = lang === 'ar'
  const [actives, setActives] = useState<Set<Couche>>(() => new Set(couchesInitiales))
  const [choisi, setChoisi] = useState<string | null>(null)

  const present = useMemo(() => new Set<Couche>(graph.nodes.map(n => coucheDe(n.kind)).filter((c): c is Couche => !!c)), [graph])
  const vue = useMemo(() => filtrerCouches(graph, actives), [graph, actives])
  const places = useMemo(() => disposer(vue), [vue])
  const pos = useMemo(() => new Map(places.map(p => [p.id, p])), [places])
  const noeuds = useMemo(() => new Map(vue.nodes.map(n => [n.id, n])), [vue])
  const nom = (n: GraphNode) => (ar && n.labelAr) || n.label
  const detail = (n: GraphNode) => (ar && n.detailAr) || n.detail
  const sel = choisi ? noeuds.get(choisi) ?? null : null
  // arrondi : Math.cos/sin peuvent différer au dernier chiffre entre serveur et navigateur (erreur d'hydratation)
  const px = (x: number) => Math.round((W / 2 + x * (W / 2 - 84)) * 10) / 10
  const py = (y: number) => Math.round((H / 2 + y * (H / 2 - 46)) * 10) / 10

  const aretesSel = sel ? vue.edges.filter(e => e.source === sel.id || e.target === sel.id) : []
  const couleurNoeud = (n: GraphNode) => ((n.kind === 'pays' || n.kind === 'substance') && n.local ? COULEUR_LOCAL : COULEUR[n.kind])
  const typesPresents = [...new Set(vue.nodes.map(n => n.kind))]

  /** Premier clic : sélectionne ; clic sur le nœud déjà sélectionné : ouvre sa page quand elle existe. */
  function activer(n: GraphNode) {
    if (choisi === n.id && n.href) router.push(n.href)
    else setChoisi(n.id)
  }

  function telecharger() {
    const blob = new Blob(['﻿' + enCsv(vue)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `graphe-${graph.centre.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.brassDark }}>{t.filtrer}</span>
        {COUCHES.filter(c => present.has(c)).map(c => {
          const on = actives.has(c)
          return (
            <button key={c} type="button" aria-pressed={on}
              onClick={() => setActives(s => { const n = new Set(s); on ? n.delete(c) : n.add(c); return n })}
              style={{ font: 'inherit', fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 999, cursor: 'pointer',
                border: `1.5px solid ${on ? C.blueDeep : '#cbd5e1'}`, background: on ? C.blueDeep : 'white', color: on ? 'white' : C.muted }}>
              {t.couches[c]}
            </button>
          )
        })}
        {exportCsv && (
          <button type="button" onClick={telecharger} style={{ font: 'inherit', fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 999, cursor: 'pointer', marginInlineStart: 'auto', border: `1.5px solid ${C.brass}`, background: C.cream, color: C.ink }}>
            ⬇ {t.csv}
          </button>
        )}
      </div>

      <div style={{ position: 'relative', border: `1px solid ${C.creamEdge}`, borderRadius: 14, background: '#fffdf6', overflow: 'hidden' }}>
        {demo && (
          <span style={{ position: 'absolute', top: 10, insetInlineStart: 10, fontSize: 11, fontWeight: 800, letterSpacing: '.08em', padding: '3px 9px', borderRadius: 6, background: C.brass, color: 'white' }}>{t.demo}</span>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${t.graphe} — ${nom(noeuds.get(vue.centre) ?? vue.nodes[0])}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <g fill="none">
            {vue.edges.map((e, i) => {
              const a = pos.get(e.source), b = pos.get(e.target)
              if (!a || !b) return null
              const g = e.niveau ? GRAVITE_STYLE[e.niveau] : null
              const actif = !sel || e.source === sel.id || e.target === sel.id
              return (
                <line key={i} x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)}
                  stroke={g?.c ?? '#c9d1de'} strokeWidth={g?.w ?? 1.6} strokeDasharray={g?.dash} opacity={actif ? 1 : 0.18} />
              )
            })}
          </g>
          {vue.nodes.map(n => {
            const p = pos.get(n.id)
            if (!p) return null
            const x = px(p.x), y = py(p.y), r = p.profondeur === 0 ? 30 : 10 + Math.min(1, (p.r - 0.045) / 0.05) * 9
            const estSel = sel?.id === n.id
            const voisin = !sel || estSel || aretesSel.some(e => e.source === n.id || e.target === n.id)
            // le libellé complet d'une classe ATC est dans le panneau de détail ; sur le dessin, le code suffit
            const etiquette = n.kind === 'atc' && p.profondeur === 1 ? nom(n).split(' · ')[0] : abreger(nom(n), p.profondeur === 0 ? 22 : 17)
            return (
              <g key={n.id} tabIndex={0} role="button" aria-label={`${t.kinds[n.kind]} : ${nom(n)}${detail(n) ? ` — ${detail(n)}` : ''}${n.href ? ` — ${t.ouvrable}` : ''}`}
                aria-pressed={estSel} opacity={voisin ? 1 : 0.45} style={{ cursor: 'pointer', outline: 'none' }}
                onMouseEnter={() => setChoisi(n.id)} onFocus={() => setChoisi(n.id)} onClick={() => activer(n)}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activer(n) } }}>
                <circle cx={x} cy={y} r={r} fill={couleurNoeud(n)} stroke={estSel ? C.ink : 'white'} strokeWidth={estSel ? 3 : 2} />
                {n.href && <text x={x + r * 0.72} y={y - r * 0.55} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff" stroke={C.ink} strokeWidth={0.6} paintOrder="stroke">↗</text>}
                <text x={x} y={y + r + 15} textAnchor="middle" fontSize={p.profondeur === 0 ? 16 : 13.5} fontWeight={p.profondeur === 0 ? 800 : 600} fill={C.ink}
                  stroke="#fffdf6" strokeWidth={3} paintOrder="stroke">{etiquette}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: C.muted, margin: '10px 0 0' }}>
        {typesPresents.map(k => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 11, height: 11, borderRadius: '50%', background: COULEUR[k], display: 'inline-block' }} />{t.kinds[k]}
          </span>
        ))}
        {vue.nodes.some(n => n.local) && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 11, height: 11, borderRadius: '50%', background: COULEUR_LOCAL, display: 'inline-block' }} />{t.local}</span>
        )}
      </div>
      {vue.edges.some(e => e.niveau) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: C.muted, margin: '6px 0 0', alignItems: 'center' }}>
          <b style={{ color: C.ink }}>{t.legendeGravite}</b>
          {(Object.keys(GRAVITE_STYLE) as (keyof typeof GRAVITE_STYLE)[]).map(g => (
            <span key={g} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke={GRAVITE_STYLE[g].c} strokeWidth={GRAVITE_STYLE[g].w} strokeDasharray={GRAVITE_STYLE[g].dash} /></svg>
              {t.gravites[g as keyof typeof t.gravites]}
            </span>
          ))}
        </div>
      )}

      <div aria-live="polite" style={{ marginTop: 12, minHeight: 56, padding: '10px 14px', borderRadius: 10, background: C.cream, border: `1px solid ${C.creamEdge}`, fontSize: 14.5 }}>
        {sel ? (
          <>
            <b>{nom(sel)}</b> <span style={{ color: C.muted }}>· {t.kinds[sel.kind]}</span>
            {detail(sel) && <div style={{ color: C.muted }}>{detail(sel)}</div>}
            {(sel.href || (onExplorer && (sel.kind === 'substance' || sel.kind === 'atc' || sel.kind === 'interaction') && sel.id !== vue.centre)) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 2px' }}>
                {sel.href && <Link href={sel.href} style={{ fontWeight: 700, fontSize: 13.5, padding: '4px 12px', borderRadius: 999, border: `1.5px solid ${C.brass}`, background: 'white', color: C.ink, textDecoration: 'none' }}>{t.ouvrir} ↗</Link>}
                {onExplorer && sel.id !== vue.centre && (sel.kind === 'substance' || sel.kind === 'atc' || sel.kind === 'interaction') && <button type="button" onClick={() => onExplorer(sel)} style={{ font: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '4px 12px', borderRadius: 999, border: `1.5px solid ${C.blueDeep}`, background: C.blueDeep, color: 'white', cursor: 'pointer' }}>{t.recentrer}</button>}
              </div>
            )}
            {aretesSel.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingInlineStart: 18, color: C.ink }}>
                {aretesSel.slice(0, 6).map((e, i) => {
                  const autre = noeuds.get(e.source === sel.id ? e.target : e.source)
                  return <li key={i}>{e.source === sel.id ? t.relations[e.kind] : t.inverses[e.kind]} <b>{autre ? nom(autre) : ''}</b>{e.niveau ? ` (${t.gravites[e.niveau]})` : ''}</li>
                })}
              </ul>
            )}
          </>
        ) : <span style={{ color: C.muted }}>{t.choisir}</span>}
      </div>

      {vue.nodes.some(n => n.href) && <p style={{ fontSize: 13, color: C.muted, margin: '8px 0 0' }}>{t.astuce}</p>}
      {vue.tronque && <p style={{ fontSize: 13, color: C.muted, margin: '8px 0 0' }}>{t.tronque}</p>}

      <div style={stats}>
        {graph.stats.map(s => (
          <div key={s.cle} style={{ border: `1px solid ${C.creamEdge}`, borderRadius: 12, padding: '10px 12px', background: 'white' }}>
            <b style={{ display: 'block', fontSize: 24, lineHeight: 1.15, color: C.blueDeep, fontVariantNumeric: 'tabular-nums' }}>{s.valeur}</b>
            <span style={{ fontSize: 13, color: C.muted }}>{ar ? s.ar : s.fr}</span>
          </div>
        ))}
      </div>

      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14, color: C.blueDeep }}>{t.liste}</summary>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, marginTop: 8 }}>
            <thead><tr>{[t.de, t.relation, t.vers].map(h => <th key={h} style={{ textAlign: 'start', padding: '6px 8px', borderBottom: `1px solid ${C.creamEdge}`, color: C.muted }}>{h}</th>)}</tr></thead>
            <tbody>
              {vue.edges.map((e, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px 8px', borderBottom: `1px solid ${C.creamEdge}` }}>{nom(noeuds.get(e.source)!)}</td>
                  <td style={{ padding: '5px 8px', borderBottom: `1px solid ${C.creamEdge}`, color: C.muted }}>{t.relations[e.kind]}{e.niveau ? ` · ${t.gravites[e.niveau]}` : ''}</td>
                  <td style={{ padding: '5px 8px', borderBottom: `1px solid ${C.creamEdge}` }}>{nom(noeuds.get(e.target)!)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
