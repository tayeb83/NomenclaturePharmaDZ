import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { ANSM_THESAURUS_URL, grouperParNiveau, type InteractionItem, type InteractionsFiche, type Niveau } from '@/lib/interactions'

const NIVEAU: Record<Niveau, { fr: string; ar: string; color: string; bg: string; line: string; icon: string }> = {
  contre_indication: { fr: 'Contre-indication', ar: 'مضاد استطباب (ممنوع الجمع)', color: '#991b1b', bg: '#fee2e2', line: '#f3b4b4', icon: '⛔' },
  deconseillee: { fr: 'Association déconseillée', ar: 'جمع غير موصى به', color: '#9a3412', bg: '#ffedd5', line: '#f5c79a', icon: '⚠️' },
  precaution_emploi: { fr: 'Précaution d\'emploi', ar: 'احتياطات الاستعمال', color: '#854d0e', bg: '#fef3c7', line: '#ecd68a', icon: 'ℹ️' },
  a_prendre_en_compte: { fr: 'À prendre en compte', ar: 'يؤخذ بعين الاعتبار', color: '#475569', bg: '#f1f5f9', line: '#dbe3e8', icon: '·' },
}

const BLUE = '#1d4e9e'
const small: React.CSSProperties = { fontSize: 12.5, color: '#64748b' }
const link: React.CSSProperties = { color: 'var(--blue)' }
/** Au-delà de ce nombre, les interactions de niveau « précaution d'emploi » se replient. */
const VISIBLES = 6

const t = (lang: Lang, fr: string, ar: string) => pickLang(lang, { fr, ar })

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11.5, letterSpacing: '.04em', textTransform: 'uppercase', padding: '1px 7px', borderRadius: 4, background: 'white', color: '#5b6b80', border: '1px solid #dbe3e8' }}>
      {children}
    </span>
  )
}

function Carte({ it, fiche, lang }: { it: InteractionItem; fiche: InteractionsFiche; lang: Lang }) {
  const n = NIVEAU[it.niveau]
  const p = fiche.partenaires[it.id]
  // un texte français sur une page arabe garde sa direction d'origine
  const dir = it.langue === 'ar' ? 'rtl' : 'ltr'
  const txt: React.CSSProperties = { margin: 0, fontSize: it.langue === 'ar' ? 16 : 14.5, lineHeight: it.langue === 'ar' ? 1.9 : 1.6, color: '#0f172a', whiteSpace: 'pre-line' }
  const labelStyle: React.CSSProperties = lang === 'ar'
    ? { fontSize: 14, fontWeight: 700, color: '#5b6b80', margin: 0 }
    : { fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5b6b80', margin: 0 }
  return (
    <article style={{ background: 'white', border: `1px solid ${n.line}`, borderRadius: 10, overflow: 'hidden' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'center', padding: '9px 14px', background: n.bg }}>
        <h4 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: '#12233f', letterSpacing: '.01em' }}>
          {p?.dci ? (
            <Link href={`/dci/${encodeURIComponent(p.dci.toLowerCase())}`} style={{ color: BLUE, textDecoration: 'none' }}>{it.partenaire}</Link>
          ) : it.partenaire}
        </h4>
        <Tag>{it.partenaire_est_classe ? t(lang, 'Classe', 'صنف') : t(lang, 'Substance', 'مادة')}</Tag>
        {it.niveaux.length > 1 && it.niveaux.map(k => (
          <span key={k} style={{ background: 'white', color: NIVEAU[k].color, border: `1px solid ${NIVEAU[k].line}`, borderRadius: 999, padding: '0 9px', fontSize: 12.5, fontWeight: 700 }}>
            {NIVEAU[k][lang]}
          </span>
        ))}
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
          <p dir="ltr" style={{ margin: '6px 0 0', lineHeight: 1.6 }}>
            {p.membres.join(', ')}{p.membres_total > p.membres.length ? ' …' : ''}
          </p>
        </details>
      )}

      <footer style={{ ...small, padding: '6px 14px', borderTop: '1px solid #eef2f6', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>
        <a href={`${ANSM_THESAURUS_URL}#page=${it.page}`} target="_blank" rel="noopener noreferrer" style={{ ...link, textDecoration: 'none' }}>
          {t(lang, `Thesaurus ANSM · p.${it.page} ↗`, `Thesaurus ANSM · ص.${it.page} ↗`)}
        </a>
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
 * Interactions médicamenteuses du Thesaurus ANSM, par gravité. Les textes sont ceux de l'ANSM
 * (français) ou leur traduction arabe ; seules les lignes écrites pour la substance de la fiche et
 * pour ses classes s'affichent, jamais celles écrites pour le partenaire.
 */
export function InteractionsAnsmSection({ fiche, lang }: { fiche: InteractionsFiche; lang: Lang }) {
  const groupes = grouperParNiveau(fiche.items)
  return (
    <section id="interactions" style={{ marginTop: 40, scrollMarginTop: 16 }}>
      <h2 className="section-title">{t(lang, '⚠️ Interactions médicamenteuses', '⚠️ التداخلات الدوائية')}</h2>
      <div className="section-sub">
        {t(lang,
          'Interactions de la substance active avec d\'autres médicaments, selon le Thesaurus de l\'ANSM (France). Elles valent pour toutes les spécialités qui contiennent cette substance.',
          'تداخلات المادة الفعالة مع أدوية أخرى حسب «Thesaurus» الوكالة الفرنسية ANSM. وهي سارية على كل الأدوية التي تحتوي هذه المادة.')}
      </div>

      <div style={{ marginTop: 10, background: '#fff8e6', border: '1px solid #ecd68a', borderRadius: 8, padding: '9px 14px', fontSize: 14, color: '#0f172a' }}>
        <strong>{t(lang, 'Information, pas une prescription.', 'معلومة وليست وصفة طبية.')}</strong>{' '}
        {t(lang,
          'Ces interactions ne remplacent pas l\'avis d\'un médecin ou d\'un pharmacien.',
          'لا تغني هذه التداخلات عن استشارة الطبيب أو الصيدلي.')}
        {fiche.repli_fr && (
          <> {t(lang, '', 'الترجمة العربية قيد الإعداد: يظهر النص الفرنسي الأصلي حين تغيب.')}</>
        )}
      </div>

      <div style={{ ...small, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 8px', alignItems: 'center' }}>
        <span>{t(lang, 'Substances analysées :', 'المواد المحللة:')}</span>
        {fiche.substances.map(s => (
          <span key={s} style={{ background: '#e4edf7', color: BLUE, borderRadius: 999, padding: '0 10px', fontWeight: 700 }}>{s}</span>
        ))}
        {fiche.classes.length > 0 && (
          <span>{t(lang, `et leurs classes (${fiche.classes.length})`, `وأصنافها (${fiche.classes.length})`)}</span>
        )}
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 22 }}>
        {groupes.map(({ niveau, items }) => {
          const n = NIVEAU[niveau]
          // contre-indications et associations déconseillées restent toujours visibles
          const replie = niveau === 'a_prendre_en_compte'
          const visibles = niveau === 'precaution_emploi' && items.length > VISIBLES + 2 ? items.slice(0, VISIBLES) : items
          const reste = items.slice(visibles.length)
          const titre = (
            <>
              <span aria-hidden="true">{n.icon}</span>
              <span>{n[lang]}</span>
              <span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 12, border: `1px solid ${n.line}`, borderRadius: 999, padding: '0 8px' }}>{items.length}</span>
            </>
          )
          const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: n.color, margin: 0 }
          const liste = (l: InteractionItem[]) => (
            <div style={{ display: 'grid', gap: 10 }}>
              {l.map(it => <Carte key={it.id} it={it} fiche={fiche} lang={lang} />)}
            </div>
          )
          if (replie) {
            return (
              <details key={niveau} style={{ display: 'grid', gap: 10 }}>
                <summary style={{ ...head, cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>{titre}</summary>
                <p style={{ ...small, margin: '0 0 10px' }}>
                  {t(lang, 'Pas de conduite imposée : à garder à l\'esprit lors de l\'association.', 'لا يُفرض سلوك محدد، يكفي أخذه بعين الاعتبار عند الجمع.')}
                </p>
                {liste(items)}
              </details>
            )
          }
          return (
            <div key={niveau} style={{ display: 'grid', gap: 10 }}>
              <h3 style={head}>{titre}</h3>
              {liste(visibles)}
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

      <p style={{ ...small, marginTop: 12, lineHeight: 1.6 }}>
        {t(lang, 'Source : ', 'المصدر: ')}
        <a href={ANSM_THESAURUS_URL} target="_blank" rel="noopener noreferrer" style={link}>{fiche.version}</a>
        {'. '}
        {t(lang,
          'Textes de l\'ANSM reproduits tels quels ; la substance du médicament est rapprochée automatiquement du thésaurus. Une erreur ? ',
          'نصوص الوكالة منقولة كما هي، وتُطابَق المادة الفعالة للدواء مع «Thesaurus» آليًا. هل من خطأ؟ ')}
        <Link href="/contact" style={link}>{t(lang, 'Écrivez-nous', 'راسلنا')}</Link>
      </p>
    </section>
  )
}
