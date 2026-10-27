'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { formatPpa } from '@/lib/ppa-format'
import { InteractionsAnsmSection } from '@/components/drug/InteractionsAnsmSection'
import type { Comparaison, CoteComparaison, FicheComparee } from '@/lib/comparateur-medicaments'
import { Choix } from './Choix'
import { EnteteLien, GuideLecture } from './Explication'
import { PartenairesPanel } from './PartenairesPanel'
import { TX } from './textes'
import { memeSelection, refDe, type Selection } from './types'

const DISPLAY = 'var(--font-display, Amiri, Georgia, serif)'

const TYPE: Record<string, { fr: string; ar: string }> = {
  GE: { fr: 'Générique', ar: 'جنيس' }, 'Gé': { fr: 'Générique', ar: 'جنيس' }, RE: { fr: 'Référence étrangère', ar: 'مرجعي أجنبي' },
  BIO: { fr: 'Biologique', ar: 'بيولوجي' }, I: { fr: 'Innovateur', ar: 'مبتكر' }, 'Ré': { fr: 'Référence étrangère', ar: 'مرجعي أجنبي' },
}
const STATUT: Record<string, { fr: string; ar: string }> = {
  F: { fr: 'Fabriqué en Algérie', ar: 'مصنع في الجزائر' }, I: { fr: 'Importé', ar: 'مستورد' },
}
const SOURCE: Record<string, { fr: string; ar: string }> = {
  enregistrement: { fr: 'Enregistré', ar: 'مسجل' }, retrait: { fr: 'Retiré', ar: 'مسحوب' }, non_renouvele: { fr: 'AMM non renouvelée', ar: 'AMM غير مجددة' },
}

type Ligne = { cle: string; fr: string; ar: string; va: string | null; vb: string | null }

function lignes(a: FicheComparee, b: FicheComparee, lang: 'fr' | 'ar'): Ligne[] {
  const lab = (m: Record<string, { fr: string; ar: string }>, v: string | null) => (v ? m[v]?.[lang] ?? v : null)
  const atc = (f: FicheComparee) => (f.code_atc ? `${f.code_atc}${f.atc_label ? ` — ${f.atc_label}` : ''}` : null)
  const prix = (f: FicheComparee) => (f.ppa != null ? formatPpa(f.ppa, lang) : null)
  const inter = (f: FicheComparee) => (f.nb_interactions != null ? String(f.nb_interactions) : null)
  const rows: [string, string, string, (f: FicheComparee) => string | null][] = [
    ['dci', 'Substance active', 'المادة الفعالة', f => f.dci],
    ['forme', 'Forme', 'الشكل', f => f.forme],
    ['dosage', 'Dosage', 'الجرعة', f => f.dosage],
    ['cond', 'Conditionnement', 'التعبئة', f => f.conditionnement],
    ['labo', 'Laboratoire', 'المخبر', f => f.labo],
    ['pays', 'Pays', 'البلد', f => f.pays],
    ['type', 'Type', 'النوع', f => lab(TYPE, f.type_prod)],
    ['statut', 'Origine', 'المنشأ', f => lab(STATUT, f.statut)],
    ['etat', 'Situation', 'الوضعية', f => lab(SOURCE, f.source)],
    ['liste', 'Liste', 'القائمة', f => f.liste],
    ['presc', 'Prescription', 'الوصفة', f => f.prescription],
    ['atc', 'Classe ATC', 'الفئة ATC', atc],
    ['init', 'Enregistrement', 'تاريخ التسجيل', f => f.date_init],
    ['fin', 'Fin de validité', 'نهاية الصلاحية', f => f.date_final],
    ['ppa', 'Prix (PPA)', 'الثمن (PPA)', prix],
    ['nbi', 'Interactions ANSM (substance)', 'تداخلات ANSM (المادة)', inter],
  ]
  return rows.map(([cle, fr, ar, f]) => ({ cle, fr, ar, va: f(a), vb: f(b) }))
}

const norm = (v: string | null) => (v ?? '').replace(/\s+/g, ' ').trim().toLowerCase()


const dciHref = (dci: string) => `/dci/${encodeURIComponent(dci.toLowerCase())}`
const noms = (c: CoteComparaison) => c.composants.map(x => x.nom).join(' + ') || c.dci

export function ComparateurMedicaments() {
  const { lang } = useLanguage()
  const t = TX[lang]
  const uid = useId()
  const [a, setA] = useState<Selection | null>(null)
  const [b, setB] = useState<Selection | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [res, setRes] = useState<Comparaison | null>(null)
  const [seulementDiff, setSeulementDiff] = useState(false)

  // un résultat affiché ne doit pas survivre au changement d'un des deux choix
  useEffect(() => { setRes(null); setErreur(null) }, [a, b, lang])

  async function comparer() {
    if (!a || !b) return
    if (memeSelection(a, b)) { setErreur(t.deux); return }
    setOccupe(true)
    setErreur(null)
    try {
      const r = await fetch(`/api/outils/comparateur-medicaments?${new URLSearchParams({ a: refDe(a), b: refDe(b), lang })}`)
      if (!r.ok) { setErreur(t.erreurs[r.status] ?? t.erreurs.autre); return }
      setRes(await r.json())
    } catch {
      setErreur(t.erreurs.autre)
    } finally {
      setOccupe(false)
    }
  }

  const fa = res?.a.fiche ?? null
  const fb = res?.b.fiche ?? null
  const rows = fa && fb ? lignes(fa, fb, lang) : []
  const affichees = seulementDiff ? rows.filter(l => norm(l.va) !== norm(l.vb)) : rows
  const memeTout = !!res && !!fa && !!fb && res.meme_dci && norm(fa.forme) === norm(fb.forme) && norm(fa.dosage) === norm(fb.dosage)
  let prix: string | null = null
  if (fa && fb) {
    if (fa.ppa != null && fb.ppa != null && fa.ppa !== fb.ppa) {
      const [moins, plus] = fa.ppa < fb.ppa ? [fa, fb] : [fb, fa]
      const d = plus.ppa! - moins.ppa!
      prix = t.moinsCher(moins.nom_marque, formatPpa(Math.round(d * 100) / 100, lang), `${Math.round((d / plus.ppa!) * 100)} %`)
    } else if (fa.ppa == null || fb.ppa == null) prix = t.sansPrix
  }
  const hrefFiche = (f: FicheComparee) => `/${lang === 'ar' ? 'ar/' : ''}medicament/${f.source}/${f.id}`

  const note: React.CSSProperties = { margin: 0, padding: '10px 14px', background: 'white', border: `1px solid ${C.creamEdge}`, borderInlineStart: `4px solid ${C.brass}`, borderRadius: 8, fontSize: 14.5, lineHeight: 1.7, color: C.ink }
  const libelle = (s: Selection) => (s.type === 'marque' ? s.nom_marque : s.dci)

  // un seul côté choisi : on propose l'autre parmi les partenaires d'interaction
  const seul = a && !b ? { cote: a, remplit: setB, autre: t.b } : b && !a ? { cote: b, remplit: setA, autre: t.a } : null

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.7 }}>{t.chapeau}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
        <Choix id={`${uid}-a`} titre={t.a} valeur={a} onChoix={setA} lang={lang} />
        <Choix id={`${uid}-b`} titre={t.b} valeur={b} onChoix={setB} lang={lang} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={comparer} disabled={!a || !b || occupe}
          style={{ font: 'inherit', fontSize: 16, fontWeight: 700, padding: '10px 24px', borderRadius: 999, border: `2px solid ${C.brass}`, background: !a || !b ? '#e5e7eb' : C.navy, color: !a || !b ? '#6b7280' : C.brassLight, cursor: !a || !b ? 'not-allowed' : 'pointer' }}>
          {occupe ? t.calcul : t.comparer}
        </button>
        {a && b && (
          <button type="button" onClick={() => { setA(b); setB(a) }}
            style={{ font: 'inherit', fontSize: 14, padding: '8px 16px', borderRadius: 999, border: `1.5px solid ${C.creamEdge}`, background: 'white', color: C.blue, cursor: 'pointer' }}>
            ⇄ {t.echange}
          </button>
        )}
        <span role="alert" aria-live="assertive" style={{ color: '#9b1c1c', fontSize: 14 }}>{erreur}</span>
      </div>

      {seul && (
        <PartenairesPanel cote={seul.cote} nomCote={libelle(seul.cote)} autre={seul.autre.toLowerCase()} lang={lang} onChoisir={seul.remplit} />
      )}

      {res && (
        <div style={{ display: 'grid', gap: 16 }} aria-live="polite">
          {memeTout ? <p style={note}><strong>{t.memeDci}.</strong> {t.memeTout}</p>
            : res.meme_dci ? <p style={note}><strong>{t.memeDci}.</strong> {t.memeDciTexte}</p> : null}
          {prix && <p style={note}>{prix}</p>}

          {fa && fb ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" aria-pressed={seulementDiff} onClick={() => setSeulementDiff(v => !v)}
                  style={{ font: 'inherit', fontSize: 14, padding: '5px 14px', borderRadius: 999, cursor: 'pointer', border: `1.5px solid ${seulementDiff ? C.brass : C.creamEdge}`, background: seulementDiff ? C.cream : 'white', color: C.navy, fontWeight: seulementDiff ? 700 : 500 }}>
                  {seulementDiff ? t.tout : t.diff}
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: `1.5px solid ${C.brass}`, borderRadius: 12, background: 'white' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5, minWidth: 520 }}>
                  <thead>
                    <tr style={{ background: C.navyDeep, color: 'white' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'start', width: '24%' }} />
                      {[fa, fb].map(f => (
                        <th key={`${f.source}:${f.id}`} scope="col" style={{ padding: '10px 12px', textAlign: 'start', verticalAlign: 'top' }}>
                          <div style={{ fontFamily: DISPLAY, fontSize: 21, color: C.brassLight }}>{f.nom_marque}</div>
                          <Link href={hrefFiche(f)} style={{ fontSize: 12.5, fontWeight: 400, color: '#cfe0f7' }}>{t.voir} ›</Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {affichees.map(l => {
                      const different = norm(l.va) !== norm(l.vb)
                      return (
                        <tr key={l.cle} style={{ background: different ? '#fdf6e3' : 'white', borderTop: `1px solid ${C.creamEdge}` }}>
                          <th scope="row" style={{ padding: '9px 12px', textAlign: 'start', fontWeight: 700, color: C.brassDark, verticalAlign: 'top' }}>{lang === 'ar' ? l.ar : l.fr}</th>
                          <td style={{ padding: '9px 12px', verticalAlign: 'top', fontWeight: different ? 700 : 400 }}>{l.va ?? '—'}</td>
                          <td style={{ padding: '9px 12px', verticalAlign: 'top', fontWeight: different ? 700 : 400 }}>{l.vb ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
              {[res.a, res.b].map((c, k) => (
                <div key={k} style={{ background: 'white', border: `1.5px solid ${C.brass}`, borderRadius: 12, padding: '10px 14px', display: 'grid', gap: 2 }}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 21, fontWeight: 700, color: C.navy }} dir="ltr">{c.libelle}</div>
                  <div style={{ fontSize: 13.5, color: C.muted }} dir="ltr">{c.type === 'marque' ? c.dci : c.nb_medicaments ? t.medicamentsN(c.nb_medicaments) : t.horsNomenclature}</div>
                  {c.fiche
                    ? <Link href={hrefFiche(c.fiche)} style={{ fontSize: 13.5 }}>{t.voir} ›</Link>
                    : c.nb_medicaments ? <Link href={dciHref(c.dci)} style={{ fontSize: 13.5 }}>{t.voirDci} ›</Link> : null}
                </div>
              ))}
            </div>
          )}

          {!res.meme_dci && (
            res.retrait ? <p style={note}>{t.retire}</p>
              : res.interactions === null ? <p style={note}>{t.inconnu}</p>
              : res.interactions.items.length === 0 ? (
                <>
                  <p style={note}><strong>{t.aucuneInter(noms(res.a), noms(res.b))}</strong> {t.aucuneNote}</p>
                  <GuideLecture a={res.a} b={res.b} items={[]} noms={res.interactions.noms_ar} lang={lang} />
                </>
              ) : (
                <>
                  <GuideLecture a={res.a} b={res.b} items={res.interactions.items} noms={res.interactions.noms_ar} lang={lang} />
                  <InteractionsAnsmSection
                    fiche={res.interactions} lang={lang} titre={t.titreInter} intro={t.introInter} id="interactions-entre"
                    entete={it => <EnteteLien it={it} a={res.a} b={res.b} lang={lang} />}
                  />
                </>
              )
          )}
        </div>
      )}
    </div>
  )
}
