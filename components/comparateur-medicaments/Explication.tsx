'use client'

import { CASBAH as C } from '@/lib/garde-ornaments'
import type { Lang } from '@/lib/i18n'
import { NIVEAUX, matriceSubstances, type Composant, type InteractionItem, type Niveau } from '@/lib/interactions-core'
import type { CoteComparaison } from '@/lib/comparateur-medicaments'
import { NIVEAU } from '@/components/drug/InteractionsAnsmSection'
import { TX } from './textes'

const DISPLAY = 'var(--font-display, Amiri, Georgia, serif)'
const MONO = 'var(--font-mono, ui-monospace, monospace)'

const NOM_AR = (noms: Record<string, string> | undefined, lang: Lang, n: string) => (lang === 'ar' && noms?.[n]) || n

/** Phrase qui dit, en clair, où l'interaction se situe : `de` est le côté sous lequel le thésaurus écrit la ligne, `vers` le côté visé. */
export function phraseLien(it: InteractionItem, lang: Lang): string {
  const l = it.lien
  const t = TX[lang]
  if (!l) return ''
  const de = l.de.join(' + ')
  const vers = l.vers.join(' + ')
  if (l.portee === 'substance') return t.lienSubstance(de, vers)
  if (l.portee === 'classe') return t.lienClasse(de, l.de_via ?? '', vers, l.vers_via ?? '')
  return l.de_via ? t.lienDe(de, l.de_via) : t.lienVers(vers, l.vers_via ?? '')
}

function Boite({ cote, concernees, via, couleur }: { cote: CoteComparaison; concernees: string[]; via: string | null; couleur: string }) {
  const toutes = cote.composants.length > 0 ? cote.composants.map(c => c.nom) : concernees
  return (
    <div style={{ border: `1.5px solid ${couleur}`, borderRadius: 10, padding: '7px 10px', background: 'white', minWidth: 0, display: 'grid', gap: 4, alignContent: 'start' }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{cote.libelle}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} dir="ltr">
        {toutes.map(nom => {
          const oui = concernees.includes(nom)
          return (
            <span key={nom} style={{ borderRadius: 999, padding: '1px 9px', fontSize: 13.5, fontWeight: oui ? 700 : 400, background: oui ? couleur : 'white', color: oui ? 'white' : C.muted, border: `1px solid ${oui ? couleur : C.creamEdge}`, opacity: oui ? 1 : .75 }}>
              {nom}
            </span>
          )
        })}
      </div>
      {via && <div style={{ fontSize: 12.5, color: C.brassDark }} dir="ltr">↳ {via}</div>}
    </div>
  )
}

/**
 * En-tête pédagogique d'une carte d'interaction : les deux côtés, leurs substances concernées en plein,
 * les autres atténuées, la classe éventuelle, et la phrase qui explique le rapprochement.
 */
export function EnteteLien({ it, a, b, lang }: { it: InteractionItem; a: CoteComparaison; b: CoteComparaison; lang: Lang }) {
  const l = it.lien
  const t = TX[lang]
  if (!l) return null
  const n = NIVEAU[it.niveau]
  const concA = l.cote === 'a' ? l.de : l.vers
  const concB = l.cote === 'a' ? l.vers : l.de
  const viaA = l.cote === 'a' ? l.de_via : l.vers_via
  const viaB = l.cote === 'a' ? l.vers_via : l.de_via
  return (
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.creamEdge}`, background: C.cream, display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: MONO }}>{t.lienTitre}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: 8, alignItems: 'center' }}>
        <Boite cote={a} concernees={concA} via={viaA} couleur={C.navy} />
        <div style={{ textAlign: 'center', display: 'grid', gap: 2, justifyItems: 'center' }}>
          <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: '50%', background: n.solid, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{n.icon}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: n.color }}>{n.court[lang]}</span>
        </div>
        <Boite cote={b} concernees={concB} via={viaB} couleur={C.brassDark} />
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: C.ink }}>
        <span style={{ background: 'white', border: `1px solid ${C.creamEdge}`, borderRadius: 999, padding: '0 9px', fontSize: 12.5, fontWeight: 700, color: C.brassDark, marginInlineEnd: 8 }}>{t.portee[l.portee]}</span>
        {phraseLien(it, lang)}
      </p>
      {it.niveaux.length > 1 && (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.brassDark, borderInlineStart: `3px solid ${C.brass}`, paddingInlineStart: 10 }}>
          {t.ligneComposee}
        </p>
      )}
    </div>
  )
}

function ListeComposants({ cote, lang, noms }: { cote: CoteComparaison; lang: Lang; noms: Record<string, string> | undefined }) {
  const t = TX[lang]
  const intitule = cote.type === 'marque' ? t.gSubstancesDe(cote.libelle) : t.gSubstanceSeule
  return (
    <div style={{ border: `1px solid ${C.creamEdge}`, background: 'white', borderRadius: 10, padding: '8px 12px', display: 'grid', gap: 6, alignContent: 'start' }}>
      <strong style={{ color: C.navy, fontFamily: DISPLAY, fontSize: 17 }}>{intitule}</strong>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
        {cote.composants.map((c: Composant) => (
          <li key={c.nom} style={{ fontSize: 14, lineHeight: 1.6 }}>
            <span dir="ltr" style={{ fontWeight: 700 }}>{c.nom}</span>{' '}
            {c.titre
              ? <span style={{ color: C.muted }}>→ <span dir="ltr">{NOM_AR(noms, lang, c.titre)}</span></span>
              : <span style={{ color: '#9b1c1c' }}>({t.gAbsente})</span>}
            {c.classes.length > 0 && (
              <span style={{ color: C.muted }}> · {t.gClassesDe} : <span dir="ltr">{c.classes.map(x => NOM_AR(noms, lang, x)).join(', ')}</span></span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Matrice({ items, a, b, lang }: { items: InteractionItem[]; a: CoteComparaison; b: CoteComparaison; lang: Lang }) {
  const t = TX[lang]
  const m = matriceSubstances(items, a.composants, b.composants)
  const cellule = (niveau: Niveau | null) => {
    if (!niveau) return <span style={{ color: C.muted }} aria-label="—">·</span>
    const n = NIVEAU[niveau]
    return (
      <span title={n[lang]} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: n.bg, color: n.color, border: `1px solid ${n.line}`, borderRadius: 999, padding: '0 9px', fontSize: 12.5, fontWeight: 700 }}>
        <span aria-hidden="true">{n.icon}</span>{n.court[lang]}
      </span>
    )
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <strong style={{ color: C.navy, fontFamily: DISPLAY, fontSize: 17 }}>{t.gMatrice}</strong>
      <p style={{ margin: 0, fontSize: 13.5, color: C.muted }}>{t.gMatriceTexte}</p>
      <div style={{ overflowX: 'auto', border: `1px solid ${C.creamEdge}`, borderRadius: 10, background: 'white' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: 320 }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 10px' }} />
              {m.b.map(nom => <th key={nom} scope="col" dir="ltr" style={{ padding: '6px 10px', textAlign: 'start', color: C.brassDark }}>{nom}</th>)}
            </tr>
          </thead>
          <tbody>
            {m.a.map((nom, i) => (
              <tr key={nom} style={{ borderTop: `1px solid ${C.creamEdge}` }}>
                <th scope="row" dir="ltr" style={{ padding: '6px 10px', textAlign: 'start', color: C.navy }}>{nom}</th>
                {m.cases[i].map((c, j) => <td key={m.b[j]} style={{ padding: '6px 10px' }}>{cellule(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Bloc « Comprendre l'interaction » : substances de chaque côté, niveaux de rapprochement, gravités, matrice. */
export function GuideLecture({ a, b, items, noms, lang }: {
  a: CoteComparaison; b: CoteComparaison; items: InteractionItem[]; noms: Record<string, string> | undefined; lang: Lang
}) {
  const t = TX[lang]
  const multi = a.composants.length > 1 || b.composants.length > 1
  const present = NIVEAUX.filter(k => items.some(i => i.niveau === k))
  return (
    <details open style={{ border: `2px solid ${C.brass}`, borderRadius: 14, background: C.cream, overflow: 'hidden' }}>
      <summary style={{ cursor: 'pointer', padding: '12px 16px', fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: C.navy, background: 'white' }}>
        {t.gTitre}
      </summary>
      <div style={{ padding: '12px 16px 16px', display: 'grid', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: C.ink }}>{t.gIntro}</p>

        <div style={{ display: 'grid', gap: 8 }}>
          <strong style={{ color: C.navy, fontFamily: DISPLAY, fontSize: 18 }}>{t.gEtape1}</strong>
          <p style={{ margin: 0, fontSize: 14, color: C.muted }}>{t.gEtape1Texte}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 10 }}>
            <ListeComposants cote={a} lang={lang} noms={noms} />
            <ListeComposants cote={b} lang={lang} noms={noms} />
          </div>
        </div>

        {multi && items.some(i => i.lien) && <Matrice items={items} a={a} b={b} lang={lang} />}

        <div style={{ display: 'grid', gap: 6 }}>
          <strong style={{ color: C.navy, fontFamily: DISPLAY, fontSize: 18 }}>{t.gEtape2}</strong>
          <p style={{ margin: 0, fontSize: 14, color: C.muted }}>{t.gEtape2Texte}</p>
          <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 3, fontSize: 14, lineHeight: 1.65, color: C.ink }}>
            <li>{t.gSubstanceSubstance}</li>
            <li>{t.gMixte}</li>
            <li>{t.gClasse}</li>
          </ul>
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <strong style={{ color: C.navy, fontFamily: DISPLAY, fontSize: 18 }}>{t.gEtape3}</strong>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
            {(present.length > 0 ? present : NIVEAUX).map(k => (
              <li key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 14, lineHeight: 1.6 }}>
                <span style={{ flex: 'none', background: NIVEAU[k].solid, color: 'white', borderRadius: 999, padding: '0 10px', fontSize: 12.5, fontWeight: 700 }}>
                  {NIVEAU[k].icon} {NIVEAU[k].court[lang]}
                </span>
                <span>{t.niveauxDef[k]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  )
}
