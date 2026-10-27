'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import {
  ANSM_THESAURUS_URL, NIVEAUX, grouperParNiveau,
  type InteractionItem, type Niveau,
} from '@/lib/interactions-core'
import type { InteractionsFiche } from '@/lib/interactions'

const NIVEAU: Record<Niveau, { fr: string; ar: string; court: { fr: string; ar: string }; color: string; bg: string; line: string; solid: string; icon: string }> = {
  contre_indication: { fr: 'Contre-indication', ar: 'مضاد استطباب (ممنوع الجمع)', court: { fr: 'contre-indication', ar: 'مضاد استطباب' }, color: '#991b1b', bg: '#fee2e2', line: '#f3b4b4', solid: '#b42323', icon: '⛔' },
  deconseillee: { fr: 'Association déconseillée', ar: 'جمع غير موصى به', court: { fr: 'déconseillée', ar: 'غير موصى به' }, color: '#9a3412', bg: '#ffedd5', line: '#f5c79a', solid: '#c2570c', icon: '⚠️' },
  precaution_emploi: { fr: 'Précaution d\'emploi', ar: 'احتياطات الاستعمال', court: { fr: 'précaution', ar: 'احتياطات' }, color: '#854d0e', bg: '#fef3c7', line: '#ecd68a', solid: '#a16207', icon: 'ℹ️' },
  a_prendre_en_compte: { fr: 'À prendre en compte', ar: 'يؤخذ بعين الاعتبار', court: { fr: 'à prendre en compte', ar: 'يؤخذ بعين الاعتبار' }, color: '#475569', bg: '#f1f5f9', line: '#dbe3e8', solid: '#64748b', icon: '·' },
}

/** Couleur propre aux interactions : aucun autre bloc de la fiche n'est en rouge sombre. */
const BAND = 'linear-gradient(135deg, #7f1d1d 0%, #b42323 100%)'
const BLUE = '#1d4e9e'
const MONO = 'var(--font-mono, ui-monospace, monospace)'
const small: React.CSSProperties = { fontSize: 12.5, color: '#64748b' }
const link: React.CSSProperties = { color: 'var(--blue)' }
/** Au-delà de ce nombre, les précautions d'emploi se replient derrière « Voir les autres ». */
const VISIBLES = 6

const t = (lang: Lang, fr: string, ar: string) => pickLang(lang, { fr, ar })
const dciHref = (dci: string) => `/dci/${encodeURIComponent(dci.toLowerCase())}`
/** minuscules, sans accents ni voyelles arabes : « Rifampicine » et « ريفامبيسين » se retrouvent au clavier */
const plier = (s: string) => s.normalize('NFD').replace(/[̀-ًͯ-ٟ]/g, '').toLowerCase()

type Compte = Record<Niveau, number>
const compter = (items: InteractionItem[]): Compte => {
  const c: Compte = { contre_indication: 0, deconseillee: 0, precaution_emploi: 0, a_prendre_en_compte: 0 }
  for (const i of items) c[i.niveau]++
  return c
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '.04em', textTransform: 'uppercase', padding: '1px 7px', borderRadius: 4, background: 'white', color: '#5b6b80', border: '1px solid #dbe3e8' }}>
      {children}
    </span>
  )
}

function Carte({ it, fiche, lang, montrerNiveau }: { it: InteractionItem; fiche: InteractionsFiche; lang: Lang; montrerNiveau: boolean }) {
  const n = NIVEAU[it.niveau]
  const p = fiche.partenaires[it.id]
  // un texte français sur une page arabe garde sa direction d'origine
  const dir = it.langue === 'ar' ? 'rtl' : 'ltr'
  const txt: React.CSSProperties = { margin: 0, fontSize: it.langue === 'ar' ? 16 : 14.5, lineHeight: it.langue === 'ar' ? 1.9 : 1.6, color: '#0f172a', whiteSpace: 'pre-line' }
  const labelStyle: React.CSSProperties = lang === 'ar'
    ? { fontSize: 14, fontWeight: 700, color: '#5b6b80', margin: 0 }
    : { fontFamily: MONO, fontSize: 11.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5b6b80', margin: 0 }
  return (
    <article style={{ background: 'white', border: `1px solid ${n.line}`, borderInlineStart: `5px solid ${n.solid}`, borderRadius: 10, overflow: 'hidden' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'center', padding: '9px 14px', background: n.bg }}>
        {montrerNiveau && (
          <span style={{ background: n.solid, color: 'white', borderRadius: 999, padding: '0 10px', fontSize: 12.5, fontWeight: 700 }}>{n.court[lang]}</span>
        )}
        <h4 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: '#12233f', letterSpacing: '.01em' }}>{it.partenaire}</h4>
        {it.partenaire_origine && <span dir="ltr" lang="fr" style={{ ...small, fontWeight: 400 }}>{it.partenaire_origine}</span>}
        <Tag>{it.partenaire_est_classe ? t(lang, 'Classe', 'صنف') : t(lang, 'Substance', 'مادة')}</Tag>
        {it.niveaux.length > 1 && it.niveaux.map(k => (
          <span key={k} style={{ background: 'white', color: NIVEAU[k].color, border: `1px solid ${NIVEAU[k].line}`, borderRadius: 999, padding: '0 9px', fontSize: 12.5, fontWeight: 700 }}>
            {NIVEAU[k][lang]}
          </span>
        ))}
        {/* les médicaments de la nomenclature qui contiennent cette substance */}
        {p?.dci && (
          <Link href={dciHref(p.dci)} style={{ marginInlineStart: 'auto', fontSize: 14, color: BLUE, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
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
        <div style={{ padding: '11px 14px', display: 'grid', gap: 4, alignContent: 'start', minWidth: 0, borderTop: '1px solid #eef2f6' }}>
          <p style={{ ...labelStyle, color: n.color }}>{t(lang, 'Conduite à tenir', 'السلوك الواجب اتباعه')}</p>
          {it.conduite
            ? <p dir={dir} lang={it.langue} style={txt}>{it.conduite}</p>
            : <p style={{ ...txt, color: '#64748b' }}>{t(lang, 'Aucune conduite spécifique indiquée par la source.', 'لا يذكر المصدر سلوكًا محددًا.')}</p>}
        </div>
      </div>

      {p && p.membres.length > 0 && (
        <details style={{ padding: '0 14px 10px', fontSize: 14, color: '#475569' }}>
          <summary style={{ cursor: 'pointer', color: BLUE, paddingTop: 8 }}>
            {t(lang, `Substances de la classe (${p.membres_total})`, `المواد المنتمية إلى الصنف (${p.membres_total})`)}
          </summary>
          <p style={{ ...small, margin: '6px 0 0' }}>
            {t(lang, 'En bleu : substances présentes dans la nomenclature, cliquez pour voir leurs médicaments.', 'بالأزرق: مواد موجودة في المدونة، انقر لعرض أدويتها.')}
          </p>
          <p dir="ltr" style={{ margin: '6px 0 0', lineHeight: 1.9 }}>
            {p.membres.map((m, k) => (
              <span key={m.nom}>
                {k > 0 && ', '}
                {m.dci ? <Link href={dciHref(m.dci)} style={{ color: BLUE, fontWeight: 700 }}>{m.nom}</Link> : m.nom}
              </span>
            ))}
            {p.membres_total > p.membres.length ? ' …' : ''}
          </p>
        </details>
      )}

      <footer style={{ ...small, padding: '6px 14px', borderTop: '1px solid #eef2f6', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>
        <a href={`${ANSM_THESAURUS_URL}#page=${it.page}`} target="_blank" rel="noopener noreferrer" style={{ ...link, textDecoration: 'none' }}>
          {t(lang, `Thesaurus ANSM · p.${it.page} ↗`, `Thesaurus ANSM · ص.${it.page} ↗`)}
        </a>
        {it.relue === false && <span>{t(lang, '', 'ترجمة قيد المراجعة')}</span>}
        <span>
          {it.via_classe
            ? t(lang, `via la classe ${it.via_classe}`, `عبر الصنف ${it.via_classe}`)
            : fiche.substances.length > 1 ? t(lang, `via ${it.substance}`, `عبر ${it.substance}`) : null}
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
        background: '#fff1f1', border: '2px solid #b42323', borderRadius: 12, padding: '10px 14px', marginBottom: 20,
      }}
    >
      <span style={{ fontWeight: 800, color: '#7f1d1d', fontSize: 16 }}>
        ⚠️ {t(lang, 'Interactions médicamenteuses', 'التداخلات الدوائية')}
      </span>
      {NIVEAUX.filter(n => c[n] > 0).map(n => (
        <span key={n} style={{ background: NIVEAU[n].solid, color: 'white', borderRadius: 999, padding: '1px 11px', fontSize: 13.5, fontWeight: 700 }}>
          {c[n]} {NIVEAU[n].court[lang]}
        </span>
      ))}
      <span style={{ marginInlineStart: 'auto', fontSize: 14, fontWeight: 700, color: '#b42323' }}>
        {graves > 0
          ? t(lang, 'À vérifier avant de dispenser ›', 'يُنصح بالتحقق قبل الصرف ‹')
          : t(lang, 'Voir le détail ›', 'عرض التفاصيل ‹')}
      </span>
    </a>
  )
}

type Tri = 'gravite' | 'alpha'

/**
 * Interactions médicamenteuses du Thesaurus ANSM : panneau rouge sombre propre à ce bloc, filtres par
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
    border: `1.5px solid ${actif ? couleur : '#dbe3e8'}`, background: actif ? couleur : 'white', color: actif ? 'white' : '#12233f', fontWeight: actif ? 700 : 500,
  })

  const liste = (l: InteractionItem[], montrerNiveau = false) => (
    <div style={{ display: 'grid', gap: 10 }}>
      {l.map(it => <Carte key={it.id} it={it} fiche={fiche} lang={lang} montrerNiveau={montrerNiveau} />)}
    </div>
  )

  return (
    <section id="interactions" style={{ margin: '28px 0 8px', scrollMarginTop: 16, border: '2px solid #b42323', borderRadius: 16, background: 'white', boxShadow: '0 6px 20px rgba(127,29,29,.14)' }}>
      <div style={{ background: BAND, color: 'white', padding: '16px 20px', display: 'grid', gap: 4, borderRadius: '13px 13px 0 0' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'white' }}>
          ⚠️ {t(lang, 'Interactions médicamenteuses', 'التداخلات الدوائية')}
        </h2>
        <p style={{ margin: 0, fontSize: 14.5, color: 'rgba(255,255,255,.88)' }}>
          {t(lang,
            'Interactions de la substance active avec d\'autres médicaments, selon le Thesaurus de l\'ANSM (France). Elles valent pour toutes les spécialités qui contiennent cette substance.',
            'تداخلات المادة الفعالة مع أدوية أخرى، حسب دليل التداخلات الدوائية Thesaurus الصادر عن الوكالة الفرنسية ANSM. وهي سارية على كل الأدوية التي تحتوي هذه المادة.')}
        </p>
      </div>

      <div style={{ padding: '14px 20px 20px', display: 'grid', gap: 14 }}>
        <div style={{ background: '#fff8e6', border: '1px solid #ecd68a', borderRadius: 8, padding: '9px 14px', fontSize: 14, color: '#0f172a' }}>
          <strong>{t(lang, 'Information, pas une prescription.', 'معلومة وليست وصفة طبية.')}</strong>{' '}
          {t(lang, 'Ces interactions ne remplacent pas l\'avis d\'un médecin ou d\'un pharmacien.', 'لا تغني هذه التداخلات عن استشارة الطبيب أو الصيدلي.')}
          {fiche.repli_fr && <> {t(lang, '', 'الترجمة العربية قيد الإعداد: يظهر النص الفرنسي الأصلي حين تغيب.')}</>}
        </div>

        <div style={{ ...small, display: 'flex', flexWrap: 'wrap', gap: '4px 8px', alignItems: 'center' }}>
          <span>{t(lang, 'Substances analysées :', 'المواد المحللة:')}</span>
          {fiche.substances.map(s => (
            <span key={s} style={{ background: '#e4edf7', color: BLUE, borderRadius: 999, padding: '0 10px', fontWeight: 700 }}>{s}</span>
          ))}
          {fiche.classes.length > 0 && <span>{t(lang, `et leurs classes (${fiche.classes.length})`, `وأصنافها (${fiche.classes.length})`)}</span>}
        </div>

        {/* filtres : gravité, substance, tri */}
        <div style={{ display: 'grid', gap: 10, padding: '4px 0 12px', borderBottom: '1px solid #eef2f6' }}>
          <div role="group" aria-label={t(lang, 'Filtrer par gravité', 'التصفية حسب الخطورة')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" aria-pressed={niveau === 'tous'} onClick={() => setNiveau('tous')} style={puce(niveau === 'tous', '#12233f')}>
              {t(lang, 'Toutes', 'الكل')} <span style={{ fontFamily: MONO, fontSize: 12, opacity: .85 }}>{parRecherche.length}</span>
            </button>
            {NIVEAUX.filter(n => comptes[n] > 0 || niveau === n).map(n => (
              <button key={n} type="button" aria-pressed={niveau === n} onClick={() => setNiveau(niveau === n ? 'tous' : n)} style={puce(niveau === n, NIVEAU[n].solid)}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: niveau === n ? 'white' : NIVEAU[n].solid }} />
                {NIVEAU[n][lang]} <span style={{ fontFamily: MONO, fontSize: 12, opacity: .85 }}>{comptes[n]}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <input
              id="interactions-recherche" type="search" value={recherche} onChange={e => setRecherche(e.target.value)}
              placeholder={t(lang, 'Chercher une substance ou une classe (ex. rifampicine)…', 'ابحث عن مادة أو صنف (مثال: ريفامبيسين)…')}
              aria-label={t(lang, 'Chercher une substance ou une classe', 'ابحث عن مادة أو صنف')}
              style={{ flex: '1 1 260px', minWidth: 0, font: 'inherit', fontSize: 15, padding: '7px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8 }}
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
              <button type="button" onClick={() => { setNiveau('tous'); setRecherche('') }} style={{ font: 'inherit', background: 'none', border: 0, color: BLUE, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {t(lang, 'Tout afficher', 'عرض الكل')}
              </button>
            </p>
          )}
        </div>

        {visibles.length === 0 && (
          <p style={{ margin: 0, padding: 14, border: '1px dashed #cbd5e1', borderRadius: 8, color: '#475569' }}>
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
                    <span aria-hidden="true">{n.icon}</span>
                    <span>{n[lang]}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, border: `1px solid ${n.line}`, borderRadius: 999, padding: '0 8px' }}>{items.length}</span>
                  </>
                )
                const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: n.color, margin: 0 }
                if (replie) {
                  return (
                    <details key={k} style={{ display: 'grid', gap: 10 }}>
                      <summary style={{ ...head, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>{titre}</summary>
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
                        <summary style={{ cursor: 'pointer', color: BLUE, fontSize: 14.5 }}>
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
