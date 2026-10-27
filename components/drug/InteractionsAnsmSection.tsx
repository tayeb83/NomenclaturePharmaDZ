'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { CASBAH as C, starPoints } from '@/lib/garde-ornaments'
import {
  ANSM_THESAURUS_URL, NIVEAUX, grouperParNiveau,
  type InteractionItem, type Niveau,
} from '@/lib/interactions-core'
import type { InteractionsFiche } from '@/lib/interactions'

/**
 * Style « Casbah » du site : marine, laiton, zellige, crème, Amiri. Les quatre gravités se distinguent
 * par la teinte, par une forme (⊗ ▲ ◆ ○) et par le libellé : marine profond pour la contre-indication,
 * bleu, laiton, puis vert-de-gris pour ce qui est simplement à prendre en compte.
 */
const NIVEAU: Record<Niveau, { fr: string; ar: string; court: { fr: string; ar: string }; color: string; bg: string; line: string; solid: string; icon: string }> = {
  contre_indication: { fr: 'Contre-indication', ar: 'مضاد استطباب (ممنوع الجمع)', court: { fr: 'contre-indication', ar: 'مضاد استطباب' }, color: C.navyDeep, bg: '#e6ebf4', line: '#aab8d3', solid: C.navyDeep, icon: '⊗' },
  deconseillee: { fr: 'Association déconseillée', ar: 'جمع غير موصى به', court: { fr: 'déconseillée', ar: 'غير موصى به' }, color: C.blueDeep, bg: '#e4edf7', line: '#a9c3e6', solid: C.blue, icon: '▲' },
  precaution_emploi: { fr: 'Précaution d\'emploi', ar: 'احتياطات الاستعمال', court: { fr: 'précaution', ar: 'احتياطات' }, color: C.brassDark, bg: '#f8ebc8', line: '#e3c98a', solid: C.brass, icon: '◆' },
  a_prendre_en_compte: { fr: 'À prendre en compte', ar: 'يؤخذ بعين الاعتبار', court: { fr: 'à prendre en compte', ar: 'يؤخذ بعين الاعتبار' }, color: '#17706c', bg: C.tealLight, line: '#a8d3cf', solid: C.teal, icon: '○' },
}

const DISPLAY = 'var(--font-display, Amiri, Georgia, serif)'
const MONO = 'var(--font-mono, ui-monospace, monospace)'
const small: React.CSSProperties = { fontSize: 12.5, color: C.muted }
const link: React.CSSProperties = { color: 'var(--blue)' }
/** Au-delà de ce nombre, les précautions d'emploi se replient derrière « Voir les autres ». */
const VISIBLES = 6

const t = (lang: Lang, fr: string, ar: string) => pickLang(lang, { fr, ar })
const dciHref = (dci: string) => `/dci/${encodeURIComponent(dci.toLowerCase())}`
/** minuscules, sans accents ni voyelles arabes : « Rifampicine » et « ريفامبيسين » se retrouvent au clavier */
const plier = (s: string) => s.normalize('NFD').replace(/[̀-ًͯ-ٟ]/g, '').toLowerCase()

/** Étoile à huit branches (khatam), en SVG de données utilisable en fond. */
const etoile = (couleur: string, opacite: number, trait = 0) =>
  `<polygon points="${starPoints(28, 28, 25, 13.5)}" fill="${couleur}" fill-opacity="${opacite}" ${trait ? `stroke="${couleur}" stroke-opacity="${trait}" stroke-width="1.4"` : ''}/><circle cx="28" cy="28" r="3.6" fill="${couleur}" fill-opacity="${Math.min(1, opacite * 3)}"/>`
const uri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
/** Semis de zellige laiton très discret, sur le bandeau marine. */
const ZELLIGE_MARINE = uri(`<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">${etoile(C.brassLight, 0.06, 0.2)}</svg>`)
/** Même bandeau de zellige bleu clair que sous la navigation du site. */
const ZELLIGE_BANDE = uri(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 56 56">${etoile(C.blue, 0.12, 0.4)}</svg>`)

function Khatam({ taille = 20, couleur = C.brassLight }: { taille?: number; couleur?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 56 56" aria-hidden="true" style={{ flex: 'none' }}>
      <polygon points={starPoints(28, 28, 27, 14)} fill={couleur} />
      <circle cx="28" cy="28" r="5" fill={C.navyDeep} fillOpacity=".7" />
    </svg>
  )
}

type Compte = Record<Niveau, number>
const compter = (items: InteractionItem[]): Compte => {
  const c: Compte = { contre_indication: 0, deconseillee: 0, precaution_emploi: 0, a_prendre_en_compte: 0 }
  for (const i of items) c[i.niveau]++
  return c
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '.04em', textTransform: 'uppercase', padding: '1px 7px', borderRadius: 4, background: 'white', color: C.muted, border: `1px solid ${C.creamEdge}` }}>
      {children}
    </span>
  )
}

function Carte({ it, fiche, lang, montrerNiveau }: { it: InteractionItem; fiche: InteractionsFiche; lang: Lang; montrerNiveau: boolean }) {
  const n = NIVEAU[it.niveau]
  const p = fiche.partenaires[it.id]
  // un texte français sur une page arabe garde sa direction d'origine
  const dir = it.langue === 'ar' ? 'rtl' : 'ltr'
  const txt: React.CSSProperties = { margin: 0, fontSize: it.langue === 'ar' ? 16 : 14.5, lineHeight: it.langue === 'ar' ? 1.9 : 1.6, color: C.ink, whiteSpace: 'pre-line' }
  const labelStyle: React.CSSProperties = lang === 'ar'
    ? { fontSize: 14, fontWeight: 700, color: C.muted, margin: 0 }
    : { fontFamily: MONO, fontSize: 11.5, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, margin: 0 }
  return (
    <article style={{ background: 'white', border: `1px solid ${n.line}`, borderTop: `3px solid ${n.solid}`, borderRadius: 10, overflow: 'hidden' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'center', padding: '9px 14px', background: n.bg }}>
        {montrerNiveau && (
          <span style={{ background: n.solid, color: 'white', borderRadius: 999, padding: '0 10px', fontSize: 12.5, fontWeight: 700 }}>{n.court[lang]}</span>
        )}
        <h4 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 19, fontWeight: 700, color: C.navy, letterSpacing: '.01em' }}>{it.partenaire}</h4>
        {it.partenaire_origine && <span dir="ltr" lang="fr" style={{ ...small, fontWeight: 400 }}>{it.partenaire_origine}</span>}
        <Tag>{it.partenaire_est_classe ? t(lang, 'Classe', 'صنف') : t(lang, 'Substance', 'مادة')}</Tag>
        {it.niveaux.length > 1 && it.niveaux.map(k => (
          <span key={k} style={{ background: 'white', color: NIVEAU[k].color, border: `1px solid ${NIVEAU[k].line}`, borderRadius: 999, padding: '0 9px', fontSize: 12.5, fontWeight: 700 }}>
            {NIVEAU[k][lang]}
          </span>
        ))}
        {/* les médicaments de la nomenclature qui contiennent cette substance */}
        {p?.dci && (
          <Link href={dciHref(p.dci)} style={{ marginInlineStart: 'auto', fontSize: 14, color: C.blue, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {t(lang, 'Médicaments contenant cette substance ›', 'الأدوية المحتوية على هذه المادة ‹')}
          </Link>
        )}
        {p && p.en_nomenclature === false && (
          <span style={{ ...small, marginInlineStart: 'auto' }}>
            {t(lang, 'Aucun médicament à cette substance dans la nomenclature', 'لا يوجد دواء بهذه المادة في المدونة')}
          </span>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
        <div style={{ padding: '11px 14px', display: 'grid', gap: 4, alignContent: 'start', minWidth: 0 }}>
          <p style={labelStyle}>{t(lang, 'Risques', 'المخاطر')}</p>
          <p dir={dir} lang={it.langue} style={txt}>{it.risque}</p>
        </div>
        <div style={{ padding: '11px 14px', display: 'grid', gap: 4, alignContent: 'start', minWidth: 0, borderTop: `1px solid ${C.creamEdge}` }}>
          <p style={{ ...labelStyle, color: n.color }}>{t(lang, 'Conduite à tenir', 'السلوك الواجب اتباعه')}</p>
          {it.conduite
            ? <p dir={dir} lang={it.langue} style={txt}>{it.conduite}</p>
            : <p style={{ ...txt, color: C.muted }}>{t(lang, 'Aucune conduite spécifique indiquée par la source.', 'لا يذكر المصدر سلوكًا محددًا.')}</p>}
        </div>
      </div>

      {p && p.membres.length > 0 && (
        <details style={{ padding: '0 14px 10px', fontSize: 14, color: C.muted }}>
          <summary style={{ cursor: 'pointer', color: C.blue, paddingTop: 8 }}>
            {t(lang, `Substances de la classe (${p.membres_total})`, `المواد المنتمية إلى الصنف (${p.membres_total})`)}
          </summary>
          <p style={{ ...small, margin: '6px 0 0' }}>
            {t(lang, 'En bleu : substances présentes dans la nomenclature, cliquez pour voir leurs médicaments.', 'بالأزرق: مواد موجودة في المدونة، انقر لعرض أدويتها.')}
          </p>
          <p dir="ltr" style={{ margin: '6px 0 0', lineHeight: 1.9 }}>
            {p.membres.map((m, k) => (
              <span key={m.nom}>
                {k > 0 && ', '}
                {m.dci ? <Link href={dciHref(m.dci)} style={{ color: C.blue, fontWeight: 700 }}>{m.nom}</Link> : m.nom}
              </span>
            ))}
            {p.membres_total > p.membres.length ? ' …' : ''}
          </p>
        </details>
      )}

      <footer style={{ ...small, padding: '6px 14px', borderTop: `1px solid ${C.creamEdge}`, background: C.cream, display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>
        <a href={`${ANSM_THESAURUS_URL}#page=${it.page}`} target="_blank" rel="noopener noreferrer" style={{ ...link, textDecoration: 'none' }}>
          {t(lang, `Thesaurus ANSM · p.${it.page} ↗`, `Thesaurus ANSM · ص.${it.page} ↗`)}
        </a>
        {it.relue === false && <span>{t(lang, '', 'ترجمة قيد المراجعة')}</span>}
        <span>
          {it.via_classe
            ? t(lang, `via la classe ${it.via_classe}`, `عبر الصنف ${(fiche.noms_ar ?? {})[it.via_classe] ?? it.via_classe}`)
            : fiche.substances.length > 1 ? t(lang, `via ${it.substance}`, `عبر ${(fiche.noms_ar ?? {})[it.substance] ?? it.substance}`) : null}
        </span>
      </footer>
    </article>
  )
}

/**
 * Bandeau en haut de la fiche : le nombre d'interactions par gravité, avec un lien vers le détail.
 * Une contre-indication ne doit pas se découvrir en bas de page.
 */
export function InteractionsBandeau({ fiche, lang }: { fiche: InteractionsFiche; lang: Lang }) {
  const c = compter(fiche.items)
  const graves = c.contre_indication + c.deconseillee
  return (
    <a
      href="#interactions"
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', textDecoration: 'none', color: 'inherit',
        background: C.cream, border: `1px solid ${C.creamEdge}`, borderTop: `3px solid ${C.brass}`, borderRadius: 12, padding: '10px 14px', marginBottom: 20,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: DISPLAY, fontWeight: 700, color: C.navy, fontSize: 19 }}>
        <Khatam taille={18} couleur={C.brass} />
        {t(lang, 'Interactions médicamenteuses', 'التداخلات الدوائية')}
      </span>
      {NIVEAUX.filter(n => c[n] > 0).map(n => (
        <span key={n} style={{ background: NIVEAU[n].solid, color: 'white', borderRadius: 999, padding: '1px 11px', fontSize: 13.5, fontWeight: 700 }}>
          {NIVEAU[n].icon} {c[n]} {NIVEAU[n].court[lang]}
        </span>
      ))}
      <span style={{ marginInlineStart: 'auto', fontSize: 14, fontWeight: 700, color: C.brassDark }}>
        {graves > 0
          ? t(lang, 'À vérifier avant de dispenser ›', 'يُنصح بالتحقق قبل الصرف ‹')
          : t(lang, 'Voir le détail ›', 'عرض التفاصيل ‹')}
      </span>
    </a>
  )
}

type Tri = 'gravite' | 'alpha'

/**
 * Interactions médicamenteuses du Thesaurus ANSM : panneau marine et laiton du site, filtres par
 * gravité, recherche par substance et tri. Les textes sont ceux de l'ANSM (français) ou leur traduction
 * arabe ; seules les lignes écrites pour la substance de la fiche et pour ses classes s'affichent.
 */
export function InteractionsAnsmSection({ fiche, lang }: { fiche: InteractionsFiche; lang: Lang }) {
  const [niveau, setNiveau] = useState<Niveau | 'tous'>('tous')
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState<Tri>('gravite')

  const q = plier(recherche.trim())
  // les compteurs suivent la recherche : on voit tout de suite quelle gravité reste concernée
  const parRecherche = useMemo(
    () => (q ? fiche.items.filter(i => plier(`${i.partenaire} ${i.partenaire_origine ?? ''}`).includes(q)) : fiche.items),
    [fiche.items, q],
  )
  const comptes = compter(parRecherche)
  const visibles = niveau === 'tous' ? parRecherche : parRecherche.filter(i => i.niveau === niveau)
  const total = fiche.items.length
  const filtre = niveau !== 'tous' || q !== ''

  const puce = (actif: boolean, couleur: string): React.CSSProperties => ({
    font: 'inherit', fontSize: 14.5, display: 'inline-flex', gap: 8, alignItems: 'center', padding: '5px 13px', borderRadius: 999, cursor: 'pointer',
    border: `1.5px solid ${actif ? couleur : C.creamEdge}`, background: actif ? couleur : 'white', color: actif ? 'white' : C.navy, fontWeight: actif ? 700 : 500,
  })

  const liste = (l: InteractionItem[], montrerNiveau = false) => (
    <div style={{ display: 'grid', gap: 10 }}>
      {l.map(it => <Carte key={it.id} it={it} fiche={fiche} lang={lang} montrerNiveau={montrerNiveau} />)}
    </div>
  )

  return (
    <section id="interactions" style={{ margin: '28px 0 8px', scrollMarginTop: 16, border: `2px solid ${C.brass}`, borderRadius: 16, background: C.cream, boxShadow: '0 6px 18px rgba(18,35,63,.12)', overflow: 'hidden' }}>
      <div style={{ backgroundColor: C.navyDeep, backgroundImage: `${ZELLIGE_MARINE}, linear-gradient(135deg, ${C.blueDeep} 0%, ${C.navyDeep} 100%)`, color: 'white', padding: '16px 20px', display: 'grid', gap: 4, borderBottom: `1px solid ${C.brass}` }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, color: C.brassLight }}>
          <Khatam taille={22} />
          {t(lang, 'Interactions médicamenteuses', 'التداخلات الدوائية')}
        </h2>
        <p style={{ margin: 0, fontSize: 14.5, color: 'rgba(255,255,255,.88)' }}>
          {t(lang,
            'Interactions de la substance active avec d\'autres médicaments, selon le Thesaurus de l\'ANSM (France). Elles valent pour toutes les spécialités qui contiennent cette substance.',
            'تداخلات المادة الفعالة مع أدوية أخرى، حسب دليل التداخلات الدوائية Thesaurus الصادر عن الوكالة الفرنسية ANSM. وهي سارية على كل الأدوية التي تحتوي هذه المادة.')}
        </p>
      </div>
      {/* même bandeau de zellige que sous la navigation du site */}
      <div aria-hidden="true" style={{ height: 14, backgroundColor: C.tile, backgroundImage: ZELLIGE_BANDE, backgroundSize: '24px 24px', backgroundPosition: 'center', borderBottom: `1px solid ${C.brass}` }} />

      <div style={{ padding: '14px 20px 20px', display: 'grid', gap: 14 }}>
        <div style={{ background: 'white', border: `1px solid ${C.creamEdge}`, borderInlineStart: `4px solid ${C.brass}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, color: C.ink }}>
          <strong>{t(lang, 'Information, pas une prescription.', 'معلومة وليست وصفة طبية.')}</strong>{' '}
          {t(lang, 'Ces interactions ne remplacent pas l\'avis d\'un médecin ou d\'un pharmacien.', 'لا تغني هذه التداخلات عن استشارة الطبيب أو الصيدلي.')}
          {fiche.repli_fr && <> {t(lang, '', 'الترجمة العربية قيد الإعداد: يظهر النص الفرنسي الأصلي حين تغيب.')}</>}
        </div>

        <div style={{ ...small, display: 'flex', flexWrap: 'wrap', gap: '4px 8px', alignItems: 'center' }}>
          <span>{t(lang, 'Substances analysées :', 'المواد المحللة:')}</span>
          {fiche.substances.map(s => (
            <span key={s} style={{ background: '#e4edf7', color: C.blue, borderRadius: 999, padding: '0 10px', fontWeight: 700 }}>
              {lang === 'ar' && (fiche.noms_ar ?? {})[s] ? <>{(fiche.noms_ar ?? {})[s]} <span dir="ltr" lang="fr" style={{ fontWeight: 400 }}>({s})</span></> : s}
            </span>
          ))}
          {fiche.classes.length > 0 && <span>{t(lang, `et leurs classes (${fiche.classes.length})`, `وأصنافها (${fiche.classes.length})`)}</span>}
        </div>

        {/* filtres : gravité, substance, tri */}
        <div style={{ display: 'grid', gap: 10, padding: '4px 0 12px', borderBottom: `1px solid ${C.creamEdge}` }}>
          <div role="group" aria-label={t(lang, 'Filtrer par gravité', 'التصفية حسب الخطورة')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" aria-pressed={niveau === 'tous'} onClick={() => setNiveau('tous')} style={puce(niveau === 'tous', C.navy)}>
              {t(lang, 'Toutes', 'الكل')} <span style={{ fontFamily: MONO, fontSize: 12, opacity: .85 }}>{parRecherche.length}</span>
            </button>
            {NIVEAUX.filter(n => comptes[n] > 0 || niveau === n).map(n => (
              <button key={n} type="button" aria-pressed={niveau === n} onClick={() => setNiveau(niveau === n ? 'tous' : n)} style={puce(niveau === n, NIVEAU[n].solid)}>
                <span aria-hidden="true" style={{ color: niveau === n ? 'white' : NIVEAU[n].solid, fontSize: 13 }}>{NIVEAU[n].icon}</span>
                {NIVEAU[n][lang]} <span style={{ fontFamily: MONO, fontSize: 12, opacity: .85 }}>{comptes[n]}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <input
              id="interactions-recherche" type="search" value={recherche} onChange={e => setRecherche(e.target.value)}
              placeholder={t(lang, 'Chercher une substance ou une classe (ex. rifampicine)…', 'ابحث عن مادة أو صنف (مثال: ريفامبيسين)…')}
              aria-label={t(lang, 'Chercher une substance ou une classe', 'ابحث عن مادة أو صنف')}
              style={{ flex: '1 1 260px', minWidth: 0, font: 'inherit', fontSize: 15, padding: '7px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, background: 'white' }}
            />
            <label style={{ ...small, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {t(lang, 'Tri', 'الترتيب')}
              <select id="interactions-tri" value={tri} onChange={e => setTri(e.target.value as Tri)} style={{ font: 'inherit', fontSize: 14.5, padding: '6px 8px', border: '1.5px solid #cbd5e1', borderRadius: 8, background: 'white' }}>
                <option value="gravite">{t(lang, 'Par gravité', 'حسب الخطورة')}</option>
                <option value="alpha">{t(lang, 'Par ordre alphabétique', 'حسب الترتيب الأبجدي')}</option>
              </select>
            </label>
          </div>
          {filtre && (
            <p style={{ ...small, margin: 0 }} aria-live="polite">
              {t(lang, `${visibles.length} interaction(s) affichée(s) sur ${total}.`, `${visibles.length} تداخل معروض من أصل ${total}.`)}{' '}
              <button type="button" onClick={() => { setNiveau('tous'); setRecherche('') }} style={{ font: 'inherit', background: 'none', border: 0, color: C.blue, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {t(lang, 'Tout afficher', 'عرض الكل')}
              </button>
            </p>
          )}
        </div>

        {visibles.length === 0 && (
          <p style={{ margin: 0, padding: 14, border: `1px dashed ${C.brass}`, borderRadius: 8, color: C.muted, background: 'white' }}>
            {t(lang, 'Aucune interaction ne correspond à ce filtre.', 'لا يوجد تداخل مطابق لهذا الفلتر.')}
          </p>
        )}

        {tri === 'alpha' && visibles.length > 0
          ? liste([...visibles].sort((a, b) => a.partenaire.localeCompare(b.partenaire, lang === 'ar' ? 'ar' : 'fr') || a.id - b.id), true)
          : (
            <div style={{ display: 'grid', gap: 22 }}>
              {grouperParNiveau(visibles).map(({ niveau: k, items }) => {
                const n = NIVEAU[k]
                // « à prendre en compte » reste replié, sauf si on l'a demandé (filtre) ou cherché
                const replie = k === 'a_prendre_en_compte' && !filtre
                // les précautions d'emploi nombreuses se replient ; jamais en cours de filtre
                const coupe = k === 'precaution_emploi' && !filtre && items.length > VISIBLES + 2
                const debut = coupe ? items.slice(0, VISIBLES) : items
                const reste = items.slice(debut.length)
                const titre = (
                  <>
                    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: n.solid, color: 'white', fontSize: 14, flex: 'none' }}>{n.icon}</span>
                    <span>{n[lang]}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, border: `1px solid ${n.line}`, background: 'white', borderRadius: 999, padding: '0 8px' }}>{items.length}</span>
                  </>
                )
                const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: n.color, margin: 0 }
                if (replie) {
                  return (
                    <details key={k} style={{ display: 'grid', gap: 10 }}>
                      <summary style={{ ...head, cursor: 'pointer', fontSize: 19 }}>{titre}</summary>
                      <p style={{ ...small, margin: '0 0 10px' }}>
                        {t(lang, 'Pas de conduite imposée : à garder à l\'esprit lors de l\'association.', 'لا يُفرض سلوك محدد، يكفي أخذه بعين الاعتبار عند الجمع.')}
                      </p>
                      {liste(items)}
                    </details>
                  )
                }
                return (
                  <div key={k} style={{ display: 'grid', gap: 10 }}>
                    <h3 style={head}>{titre}</h3>
                    {liste(debut)}
                    {reste.length > 0 && (
                      <details>
                        <summary style={{ cursor: 'pointer', color: C.blue, fontSize: 14.5 }}>
                          {t(lang, `Voir les ${reste.length} autres`, `عرض ${reste.length} أخرى`)}
                        </summary>
                        <div style={{ marginTop: 10 }}>{liste(reste)}</div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        <p style={{ ...small, margin: 0, lineHeight: 1.6 }}>
          {t(lang, 'Source : ', 'المصدر: ')}
          <a href={ANSM_THESAURUS_URL} target="_blank" rel="noopener noreferrer" style={link}>{fiche.version}</a>
          {'. '}
          {t(lang,
            'Textes de l\'ANSM reproduits tels quels ; la substance du médicament est rapprochée automatiquement du thésaurus. Une erreur ? ',
            'نصوص الوكالة منقولة كما هي، وتُطابَق المادة الفعالة للدواء مع الدليل آليًا. هل من خطأ؟ ')}
          <Link href="/contact" style={link}>{t(lang, 'Écrivez-nous', 'راسلنا')}</Link>
        </p>
      </div>
    </section>
  )
}
