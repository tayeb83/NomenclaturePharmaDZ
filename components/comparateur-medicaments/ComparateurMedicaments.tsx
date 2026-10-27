'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { formatPpa } from '@/lib/ppa-format'
import { InteractionsAnsmSection } from '@/components/drug/InteractionsAnsmSection'
import type { Comparaison, FicheComparee } from '@/lib/comparateur-medicaments'

const DISPLAY = 'var(--font-display, Amiri, Georgia, serif)'

type Resultat = {
  source: 'enregistrement' | 'retrait' | 'non_renouvele'
  id: number
  nom_marque: string
  dci: string
  forme: string | null
  dosage: string | null
  labo: string | null
}

const T = {
  fr: {
    titre: 'Comparateur de deux médicaments',
    chapeau: 'Choisissez deux médicaments de la nomenclature : leurs fiches se mettent côte à côte, avec les interactions entre les deux selon le Thesaurus ANSM.',
    a: 'Premier médicament', b: 'Second médicament', chercher: 'Nom de marque ou substance…', changer: 'Changer',
    comparer: 'Comparer', calcul: 'Comparaison en cours…', echange: 'Inverser',
    diff: 'Différences seulement', tout: 'Tout afficher',
    memeDci: 'Même substance active', memeTout: 'Même substance, même forme, même dosage : ces deux médicaments sont des équivalents dans la nomenclature.',
    memeDciTexte: 'Les deux médicaments contiennent la même substance : il n\'y a pas d\'interaction à chercher entre eux (attention en revanche au cumul des doses si on les prend ensemble).',
    interdit: 'Une interaction n\'est pas toujours une interdiction : lisez la conduite à tenir.',
    aucuneInter: 'Le Thesaurus de l\'ANSM ne signale aucune interaction entre ces deux substances.',
    aucuneNote: 'Cela ne remplace pas l\'avis d\'un médecin ou d\'un pharmacien : le thésaurus ne couvre pas toutes les associations.',
    retire: 'Un des deux médicaments est retiré de la nomenclature : les interactions ne sont pas recherchées.',
    inconnu: 'Une des deux substances ne figure pas dans le Thesaurus ANSM : impossible de conclure.',
    titreInter: 'Interactions entre ces deux médicaments',
    introInter: 'Lignes du Thesaurus de l\'ANSM qui relient la substance de l\'un à celle de l\'autre (ou à leur classe), dans les deux sens.',
    moinsCher: (nom: string, d: string, p: string) => `${nom} est moins cher de ${d} (${p}).`,
    sansPrix: 'Prix non renseigné pour l\'un des deux.',
    erreurs: { 401: 'Session expirée : reconnectez-vous.', 429: 'Trop de requêtes. Réessayez dans un moment.', 404: 'Médicament introuvable.', autre: 'Une erreur est survenue. Réessayez.' } as Record<string | number, string>,
    deux: 'Choisissez deux médicaments différents.',
    voir: 'Voir la fiche',
  },
  ar: {
    titre: 'مقارنة بين دواءين',
    chapeau: 'اختر دواءين من التسمية الصيدلانية: تُعرض بطاقتاهما جنبًا إلى جنب مع التداخلات بينهما حسب دليل ANSM.',
    a: 'الدواء الأول', b: 'الدواء الثاني', chercher: 'الاسم التجاري أو المادة الفعالة…', changer: 'تغيير',
    comparer: 'قارن', calcul: 'جارٍ المقارنة…', echange: 'عكس',
    diff: 'الفروق فقط', tout: 'عرض الكل',
    memeDci: 'المادة الفعالة نفسها', memeTout: 'المادة الفعالة والشكل والجرعة نفسها: الدواءان متكافئان في التسمية.',
    memeDciTexte: 'يحتوي الدواءان على المادة نفسها، فلا تداخل يُبحث عنه بينهما (مع الانتباه إلى تراكم الجرعات عند تناولهما معًا).',
    interdit: 'ليس كل تداخل منعًا: اقرأ السلوك الواجب اتباعه.',
    aucuneInter: 'لا يُشير دليل ANSM إلى أي تداخل بين هاتين المادتين.',
    aucuneNote: 'هذا لا يغني عن استشارة الطبيب أو الصيدلي: الدليل لا يغطي كل الأدوية المتداخلة.',
    retire: 'أحد الدواءين مسحوب من التسمية: لا يُبحث عن التداخلات.',
    inconnu: 'إحدى المادتين غير واردة في دليل ANSM: لا يمكن الجزم.',
    titreInter: 'التداخلات بين هذين الدواءين',
    introInter: 'سطور دليل ANSM التي تربط مادة أحدهما بمادة الآخر (أو بصنفها)، في الاتجاهين.',
    moinsCher: (nom: string, d: string, p: string) => `${nom} أرخص بـ ${d} (${p}).`,
    sansPrix: 'الثمن غير متوفر لأحد الدواءين.',
    erreurs: { 401: 'انتهت الجلسة: سجّل الدخول من جديد.', 429: 'طلبات كثيرة. أعد المحاولة بعد قليل.', 404: 'الدواء غير موجود.', autre: 'حدث خطأ. أعد المحاولة.' } as Record<string | number, string>,
    deux: 'اختر دواءين مختلفين.',
    voir: 'عرض البطاقة',
  },
} as const

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

function Choix({ id, titre, valeur, onChoix, placeholder, changer }: {
  id: string; titre: string; valeur: Resultat | null; onChoix: (r: Resultat | null) => void; placeholder: string; changer: string
}) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Resultat[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(-1)
  const suite = useRef(0)

  useEffect(() => {
    const texte = q.trim()
    if (texte.length < 2) { setRes([]); return }
    const n = ++suite.current
    const h = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?${new URLSearchParams({ q: texte, scope: 'enregistrement', activeOnly: '1', limit: '8' })}`)
        if (!r.ok || n !== suite.current) return
        const json = await r.json()
        setRes(Array.isArray(json.results) ? json.results : [])
        setActif(-1)
      } catch { /* la saisie suivante relancera la recherche */ }
    }, 250)
    return () => clearTimeout(h)
  }, [q])

  const choisir = (r: Resultat) => { onChoix(r); setQ(''); setRes([]); setOuvert(false) }
  const presentation = (r: Resultat) => [r.forme, r.dosage].filter(Boolean).join(' · ')

  return (
    <div style={{ background: 'white', border: `1.5px solid ${C.brass}`, borderRadius: 12, padding: '12px 14px', display: 'grid', gap: 8, alignContent: 'start', minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 700, color: C.brassDark, textTransform: 'uppercase', letterSpacing: '.05em' }}>{titre}</label>
      {valeur ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: C.navy }}>{valeur.nom_marque}</div>
            <div style={{ fontSize: 13.5, color: C.muted }} dir="ltr">{valeur.dci}{presentation(valeur) ? ` — ${presentation(valeur)}` : ''}</div>
          </div>
          <button type="button" onClick={() => onChoix(null)} style={{ font: 'inherit', fontSize: 13.5, background: 'none', border: `1px solid ${C.creamEdge}`, borderRadius: 999, padding: '3px 12px', cursor: 'pointer', color: C.blue }}>{changer}</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            id={id} type="search" value={q} role="combobox" aria-expanded={ouvert && res.length > 0} aria-controls={`${id}-liste`} aria-autocomplete="list"
            autoComplete="off" placeholder={placeholder}
            onChange={e => { setQ(e.target.value); setOuvert(true) }}
            onFocus={() => setOuvert(true)}
            onBlur={() => setTimeout(() => setOuvert(false), 150)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActif(i => Math.min(i + 1, res.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActif(i => Math.max(i - 1, 0)) }
              else if (e.key === 'Enter' && actif >= 0 && res[actif]) { e.preventDefault(); choisir(res[actif]) }
              else if (e.key === 'Escape') setOuvert(false)
            }}
            style={{ font: 'inherit', fontSize: 15.5, padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, width: '100%', boxSizing: 'border-box' }}
          />
          {ouvert && res.length > 0 && (
            <ul id={`${id}-liste`} role="listbox" style={{ position: 'absolute', zIndex: 20, insetInline: 0, top: '100%', margin: '4px 0 0', padding: 0, listStyle: 'none', background: 'white', border: `1.5px solid ${C.brass}`, borderRadius: 10, boxShadow: '0 8px 20px rgba(18,35,63,.18)', maxHeight: 320, overflowY: 'auto' }}>
              {res.map((r, i) => (
                <li key={`${r.source}:${r.id}`} role="option" aria-selected={i === actif}
                  onMouseDown={e => { e.preventDefault(); choisir(r) }}
                  style={{ padding: '8px 12px', cursor: 'pointer', background: i === actif ? C.cream : 'white', borderBottom: `1px solid ${C.creamEdge}` }}>
                  <div style={{ fontWeight: 700, color: C.navy }}>{r.nom_marque}</div>
                  <div style={{ fontSize: 12.5, color: C.muted }} dir="ltr">{r.dci}{presentation(r) ? ` — ${presentation(r)}` : ''}{r.labo ? ` — ${r.labo}` : ''}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function ComparateurMedicaments() {
  const { lang } = useLanguage()
  const t = T[lang]
  const uid = useId()
  const [a, setA] = useState<Resultat | null>(null)
  const [b, setB] = useState<Resultat | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [res, setRes] = useState<Comparaison | null>(null)
  const [seulementDiff, setSeulementDiff] = useState(false)

  // un résultat affiché ne doit pas survivre au changement d'un des deux choix
  useEffect(() => { setRes(null); setErreur(null) }, [a, b, lang])

  async function comparer() {
    if (!a || !b) return
    if (a.source === b.source && a.id === b.id) { setErreur(t.deux); return }
    setOccupe(true)
    setErreur(null)
    try {
      const r = await fetch(`/api/outils/comparateur-medicaments?${new URLSearchParams({ a: `${a.source}:${a.id}`, b: `${b.source}:${b.id}`, lang })}`)
      if (!r.ok) { setErreur(t.erreurs[r.status] ?? t.erreurs.autre); return }
      setRes(await r.json())
    } catch {
      setErreur(t.erreurs.autre)
    } finally {
      setOccupe(false)
    }
  }

  const rows = res ? lignes(res.a, res.b, lang) : []
  const affichees = seulementDiff ? rows.filter(l => norm(l.va) !== norm(l.vb)) : rows
  const memeTout = !!res && res.meme_dci && norm(res.a.forme) === norm(res.b.forme) && norm(res.a.dosage) === norm(res.b.dosage)
  let prix: string | null = null
  if (res) {
    if (res.a.ppa != null && res.b.ppa != null && res.a.ppa !== res.b.ppa) {
      const [moins, plus] = res.a.ppa < res.b.ppa ? [res.a, res.b] : [res.b, res.a]
      const d = plus.ppa! - moins.ppa!
      prix = t.moinsCher(moins.nom_marque, formatPpa(Math.round(d * 100) / 100, lang), `${Math.round((d / plus.ppa!) * 100)} %`)
    } else if (res.a.ppa == null || res.b.ppa == null) prix = t.sansPrix
  }
  const hrefFiche = (f: FicheComparee) => `/${lang === 'ar' ? 'ar/' : ''}medicament/${f.source}/${f.id}`

  const note: React.CSSProperties = { margin: 0, padding: '10px 14px', background: 'white', border: `1px solid ${C.creamEdge}`, borderInlineStart: `4px solid ${C.brass}`, borderRadius: 8, fontSize: 14.5, lineHeight: 1.7, color: C.ink }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.7 }}>{t.chapeau}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
        <Choix id={`${uid}-a`} titre={t.a} valeur={a} onChoix={setA} placeholder={t.chercher} changer={t.changer} />
        <Choix id={`${uid}-b`} titre={t.b} valeur={b} onChoix={setB} placeholder={t.chercher} changer={t.changer} />
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

      {res && (
        <div style={{ display: 'grid', gap: 16 }} aria-live="polite">
          {memeTout ? <p style={note}><strong>{t.memeDci}.</strong> {t.memeTout}</p>
            : res.meme_dci ? <p style={note}><strong>{t.memeDci}.</strong> {t.memeDciTexte}</p> : null}
          {prix && <p style={note}>{prix}</p>}

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
                  {[res.a, res.b].map(f => (
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

          {!res.meme_dci && (
            res.a.source === 'retrait' || res.b.source === 'retrait' ? <p style={note}>{t.retire}</p>
              : res.interactions === null ? <p style={note}>{t.inconnu}</p>
              : res.interactions.items.length === 0 ? <p style={note}><strong>{t.aucuneInter}</strong> {t.aucuneNote}</p>
              : <InteractionsAnsmSection fiche={res.interactions} lang={lang} titre={t.titreInter} intro={t.introInter} id="interactions-entre" />
          )}
        </div>
      )}
    </div>
  )
}
