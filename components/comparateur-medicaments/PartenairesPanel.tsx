'use client'

import { useEffect, useMemo, useState } from 'react'
import { CASBAH as C } from '@/lib/garde-ornaments'
import type { Lang } from '@/lib/i18n'
import { NIVEAUX, type Niveau } from '@/lib/interactions-core'
import type { PartenairesResultat } from '@/lib/comparateur-medicaments'
import type { PartenaireSuggere } from '@/lib/interactions'
import { NIVEAU } from '@/components/drug/InteractionsAnsmSection'
import { TX } from './textes'
import { depuisMarque, refDe, type ResultatMarque, type Selection } from './types'

const DISPLAY = 'var(--font-display, Amiri, Georgia, serif)'
const VISIBLES = 8

const plier = (s: string) => s.normalize('NFD').replace(/[̀-ًͯ-ٟ]/g, '').toLowerCase()

const bouton: React.CSSProperties = { font: 'inherit', fontSize: 13.5, padding: '3px 12px', borderRadius: 999, cursor: 'pointer', border: `1.5px solid ${C.creamEdge}`, background: 'white', color: C.blue, fontWeight: 600 }

/** Marques de la nomenclature qui contiennent une substance, chargées à la demande. */
function ListeMarques({ dci, lang, onChoisir }: { dci: string; lang: Lang; onChoisir: (s: Selection) => void }) {
  const t = TX[lang]
  const [res, setRes] = useState<ResultatMarque[] | null>(null)
  useEffect(() => {
    let vivant = true
    fetch(`/api/search?${new URLSearchParams({ q: '', substance: dci, scope: 'enregistrement', activeOnly: '1', limit: '12' })}`)
      .then(r => (r.ok ? r.json() : { results: [] }))
      .then(j => { if (vivant) setRes(Array.isArray(j.results) ? j.results : []) })
      .catch(() => { if (vivant) setRes([]) })
    return () => { vivant = false }
  }, [dci])
  if (res === null) return <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{t.pMarquesCharge}</p>
  if (res.length === 0) return <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{t.pMarquesAucune}</p>
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {res.map(r => (
        <li key={`${r.source}:${r.id}`}>
          <button type="button" onClick={() => onChoisir(depuisMarque(r))} style={{ ...bouton, textAlign: 'start', color: C.navy }}>
            <strong>{r.nom_marque}</strong>
            <span style={{ fontWeight: 400, color: C.muted }} dir="ltr"> {[r.forme, r.dosage].filter(Boolean).join(' · ')}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Ligne({ p, lang, onChoisir }: { p: PartenaireSuggere; lang: Lang; onChoisir: (s: Selection) => void }) {
  const t = TX[lang]
  const n = NIVEAU[p.niveau]
  const [marques, setMarques] = useState(false)
  const [membres, setMembres] = useState(false)
  const dciCible = p.dci ?? p.nom_origine ?? p.nom
  const substance = (dci: string, nomen: boolean): Selection => ({ type: 'substance', dci: dci.toUpperCase(), n: nomen ? null : 0, classe: false })
  return (
    <li style={{ background: 'white', border: `1px solid ${n.line}`, borderInlineStart: `4px solid ${n.solid}`, borderRadius: 8, padding: '8px 12px', display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center' }}>
        <span aria-hidden="true" style={{ color: n.solid, fontSize: 14 }}>{n.icon}</span>
        <strong style={{ fontFamily: DISPLAY, fontSize: 18, color: C.navy }}>{p.nom}</strong>
        {p.nom_origine && <span dir="ltr" lang="fr" style={{ fontSize: 12.5, color: C.muted }}>{p.nom_origine}</span>}
        <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em', padding: '0 7px', borderRadius: 4, border: `1px solid ${C.creamEdge}`, color: C.muted }}>{p.est_classe ? t.pClasse : t.pSubstance}</span>
        <span style={{ background: n.solid, color: 'white', borderRadius: 999, padding: '0 9px', fontSize: 12.5, fontWeight: 700 }}>{n.court[lang]}</span>
        {p.via.length > 0 && (
          <span style={{ fontSize: 12.5, color: C.muted }}>
            {t.pVia} <span dir="ltr">{p.via.join(' + ')}</span>{p.via_classe ? ` (${t.pViaClasse} ${p.via_classe})` : ''}
          </span>
        )}
      </div>
      <p dir={p.langue === 'ar' ? 'rtl' : 'ltr'} lang={p.langue}
        style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.ink, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {p.risque}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {!p.est_classe && (
          <button type="button" onClick={() => onChoisir(substance(dciCible, !!p.dci))} style={bouton}>{t.pChoisirSubstance}</button>
        )}
        {!p.est_classe && p.dci && (
          <button type="button" aria-expanded={marques} onClick={() => setMarques(v => !v)} style={bouton}>{t.pMarques} {marques ? '▴' : '▾'}</button>
        )}
        {p.est_classe && p.membres.length > 0 && (
          <button type="button" aria-expanded={membres} onClick={() => setMembres(v => !v)} style={bouton}>{t.pMembres(p.membres_total)} {membres ? '▴' : '▾'}</button>
        )}
        {!p.est_classe && p.en_nomenclature === false && <span style={{ fontSize: 12.5, color: C.muted }}>{t.pHorsNomenclature}</span>}
      </div>
      {marques && p.dci && <ListeMarques dci={p.dci} lang={lang} onChoisir={onChoisir} />}
      {membres && (
        <div style={{ display: 'grid', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>{t.pChoisirClasse}</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {p.membres.map(m => (
              <li key={m.nom}><button type="button" onClick={() => onChoisir(substance(m.dci ?? m.nom, !!m.dci))} style={bouton} dir="ltr">{m.nom}</button></li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

/**
 * Un seul côté est choisi : on liste tout ce qui interagit avec lui selon le Thesaurus ANSM,
 * et on propose de choisir l'autre côté directement parmi ces partenaires (substance ou marque).
 */
export function PartenairesPanel({ cote, nomCote, autre, lang, onChoisir }: {
  cote: Selection; nomCote: string; autre: string; lang: Lang; onChoisir: (s: Selection) => void
}) {
  const t = TX[lang]
  const ref = refDe(cote)
  const [etat, setEtat] = useState<{ ref: string; data: PartenairesResultat | null; erreur: boolean } | null>(null)
  const [niveau, setNiveau] = useState<Niveau | 'tous'>('tous')
  const [filtre, setFiltre] = useState('')
  const [toutVoir, setToutVoir] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let vivant = true
    setNiveau('tous'); setFiltre(''); setToutVoir({})
    fetch(`/api/outils/comparateur-medicaments/partenaires?${new URLSearchParams({ a: ref, lang })}`)
      .then(async r => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<PartenairesResultat>
      })
      .then(data => { if (vivant) setEtat({ ref, data, erreur: false }) })
      .catch(() => { if (vivant) setEtat({ ref, data: null, erreur: true }) })
    return () => { vivant = false }
  }, [ref, lang])

  const data = etat?.ref === ref ? etat.data : null
  const chargement = etat?.ref !== ref
  const q = plier(filtre.trim())
  const filtres = useMemo(
    () => (data?.partenaires ?? []).filter(p => !q || plier(`${p.nom} ${p.nom_origine ?? ''}`).includes(q)),
    [data, q],
  )
  const comptes = useMemo(() => {
    const c: Record<Niveau, number> = { contre_indication: 0, deconseillee: 0, precaution_emploi: 0, a_prendre_en_compte: 0 }
    for (const p of filtres) c[p.niveau]++
    return c
  }, [filtres])
  const visibles = niveau === 'tous' ? filtres : filtres.filter(p => p.niveau === niveau)

  const puce = (actif: boolean, couleur: string): React.CSSProperties => ({
    font: 'inherit', fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center', padding: '4px 12px', borderRadius: 999, cursor: 'pointer',
    border: `1.5px solid ${actif ? couleur : C.creamEdge}`, background: actif ? couleur : 'white', color: actif ? 'white' : C.navy, fontWeight: actif ? 700 : 500,
  })

  let corps: React.ReactNode
  if (chargement) corps = <p style={{ margin: 0, color: C.muted }}>{t.pChargement}</p>
  else if (!data) corps = <p role="alert" style={{ margin: 0, color: '#9b1c1c' }}>{t.erreurs.autre}</p>
  else if (cote.type === 'marque' && cote.source === 'retrait') corps = <p style={{ margin: 0, color: C.muted }}>{t.pRetire}</p>
  else if (data.partenaires.length === 0) {
    corps = <p style={{ margin: 0, color: C.muted }}>{data.composants.some(c => c.titre || c.classes.length) ? t.pAucun : t.pInconnu}</p>
  } else {
    corps = (
      <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" aria-pressed={niveau === 'tous'} onClick={() => setNiveau('tous')} style={puce(niveau === 'tous', C.navy)}>{t.pToutes} <span style={{ opacity: .85 }}>{filtres.length}</span></button>
          {NIVEAUX.filter(k => comptes[k] > 0 || niveau === k).map(k => (
            <button key={k} type="button" aria-pressed={niveau === k} onClick={() => setNiveau(niveau === k ? 'tous' : k)} style={puce(niveau === k, NIVEAU[k].solid)}>
              <span aria-hidden="true" style={{ fontSize: 12 }}>{NIVEAU[k].icon}</span>{NIVEAU[k].court[lang]} <span style={{ opacity: .85 }}>{comptes[k]}</span>
            </button>
          ))}
          <input type="search" value={filtre} onChange={e => setFiltre(e.target.value)} placeholder={t.pFiltre} aria-label={t.pFiltre}
            style={{ flex: '1 1 220px', minWidth: 0, font: 'inherit', fontSize: 14.5, padding: '6px 10px', border: '1.5px solid #cbd5e1', borderRadius: 8, background: 'white' }} />
        </div>
        {visibles.length === 0 && <p style={{ margin: 0, color: C.muted }}>{t.pAucunFiltre}</p>}
        {NIVEAUX.map(k => {
          const l = visibles.filter(p => p.niveau === k)
          if (l.length === 0) return null
          const tout = toutVoir[k] || l.length <= VISIBLES + 2
          const affichees = tout ? l : l.slice(0, VISIBLES)
          return (
            <div key={k} style={{ display: 'grid', gap: 8 }}>
              <h4 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 18, color: NIVEAU[k].color }}>
                <span aria-hidden="true" style={{ color: NIVEAU[k].solid }}>{NIVEAU[k].icon}</span> {NIVEAU[k][lang]} <span style={{ fontSize: 13, color: C.muted }}>({l.length})</span>
              </h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                {affichees.map(p => <Ligne key={`${p.est_classe ? 'c' : 's'}:${p.nom}`} p={p} lang={lang} onChoisir={onChoisir} />)}
              </ul>
              {!tout && (
                <button type="button" onClick={() => setToutVoir(v => ({ ...v, [k]: true }))} style={{ ...bouton, justifySelf: 'start' }}>{t.pPlus(l.length - VISIBLES)}</button>
              )}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <section aria-live="polite" style={{ border: `2px solid ${C.brass}`, borderRadius: 14, background: C.cream, padding: '14px 16px', display: 'grid', gap: 12 }}>
      <div>
        <h3 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 22, color: C.navy }}>{t.pTitre(nomCote)}</h3>
        <p style={{ margin: '2px 0 0', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{t.pChapeau(autre)}</p>
      </div>
      {corps}
    </section>
  )
}
