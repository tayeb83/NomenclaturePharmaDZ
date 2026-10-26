import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { RCP_PORTAL_URL, pdfPageUrl, type Gravite, type Population, type RcpFait, type RcpLink } from '@/lib/rcp-core'

const GRAVITE: Record<Gravite, { fr: string; ar: string; color: string; bg: string }> = {
  contre_indiquee: { fr: 'Contre-indiquée', ar: 'مضادة للاستعمال', color: '#991b1b', bg: '#fee2e2' },
  deconseillee: { fr: 'Déconseillée', ar: 'غير مستحسنة', color: '#9a3412', bg: '#ffedd5' },
  precaution: { fr: 'Précaution d\'emploi', ar: 'احتياطات الاستعمال', color: '#854d0e', bg: '#fef9c3' },
  a_prendre_en_compte: { fr: 'À prendre en compte', ar: 'تؤخذ بعين الاعتبار', color: '#475569', bg: '#f1f5f9' },
  non_precisee: { fr: 'Citée dans le RCP', ar: 'مذكورة في RCP', color: '#475569', bg: '#f1f5f9' },
}
const POPULATION: Record<Population, { fr: string; ar: string }> = {
  adulte: { fr: 'Adulte', ar: 'البالغ' },
  enfant: { fr: 'Enfant', ar: 'الطفل' },
  personne_agee: { fr: 'Personne âgée', ar: 'المسن' },
  non_precisee: { fr: 'Posologie', ar: 'الجرعة' },
}

const small: React.CSSProperties = { fontSize: 12.5, color: '#64748b' }
const link: React.CSSProperties = { color: 'var(--blue)' }

function PageLink({ pdfUrl, f, lang }: { pdfUrl: string; f: RcpFait; lang: Lang }) {
  return (
    <a href={pdfPageUrl(pdfUrl, f.page)} target="_blank" rel="noopener noreferrer" style={{ ...small, ...link, whiteSpace: 'nowrap' }}>
      {pickLang(lang, { fr: `RCP ${f.section} · p.${f.page} ↗`, ar: `RCP ${f.section} · ص.${f.page} ↗` })}
    </a>
  )
}

/** Bloc thématique : pastille d'icône, titre, compteur, liseré de couleur. */
function Bloc({ icon, title, count, accent, children }: { icon: string; title: string; count: number; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderInlineStart: `4px solid ${accent}`, borderRadius: 10, padding: '10px 14px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
        <span aria-hidden="true">{icon}</span>
        <span>{title}</span>
        <span style={{ background: '#e2e8f0', color: '#475569', borderRadius: 999, padding: '0 8px', fontSize: 11.5, fontWeight: 700 }}>{count}</span>
      </h3>
      {children}
    </div>
  )
}

const chip: React.CSSProperties = {
  background: 'white', border: '1px solid #cbd5e1', borderRadius: 999, padding: '2px 10px',
  fontSize: 13.5, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap',
}
const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '6px 10px', alignItems: 'baseline', fontSize: 14 }

/** Doses : regroupées par population puis par page, un seul lien de page par groupe (au lieu d'un par valeur). */
function Doses({ doses, pdfUrl, lang }: { doses: RcpFait[]; pdfUrl: string; lang: Lang }) {
  const groups: { key: string; population: Population; first: RcpFait; items: RcpFait[] }[] = []
  for (const f of doses) {
    const population = f.population ?? 'non_precisee'
    const key = `${population}|${f.section}|${f.page}`
    const g = groups.find(x => x.key === key)
    if (g) g.items.push(f)
    else groups.push({ key, population, first: f, items: [f] })
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {groups.map(g => (
        <div key={g.key} style={{ display: 'grid', gap: 6 }}>
          <div style={{ ...row, justifyContent: 'space-between' }}>
            {g.population !== 'non_precisee' ? (
              <span style={{ ...small, fontWeight: 700 }}>{POPULATION[g.population][lang]}</span>
            ) : <span />}
            <PageLink pdfUrl={pdfUrl} f={g.first} lang={lang} />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {g.items.map(f => <li key={f.id} style={chip}>{f.libelle}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Faits({ rcp, lang }: { rcp: RcpLink; lang: Lang }) {
  // `?? []` : une fiche déjà en cache avant l'ajout des faits n'a pas ce champ
  const faits = rcp.faits ?? []
  const doses = faits.filter(f => f.type === 'dose')
  const ci = faits.filter(f => f.type === 'contre_indication')
  const gro = faits.filter(f => f.type === 'grossesse')
  const inter = faits.filter(f => f.type === 'interaction')
  if (doses.length + ci.length + gro.length + inter.length === 0) return null

  const source = pickLang(lang, {
    fr: `Source : RCP de ${rcp.laboratoire_anpp ?? rcp.nom_commercial}${rcp.version_texte ? `, version ${rcp.version_texte}` : ''}, publié sur rcp.anpp.dz.`,
    ar: `المصدر: RCP الخاص بـ ${rcp.laboratoire_anpp ?? rcp.nom_commercial}${rcp.version_texte ? `، النسخة ${rcp.version_texte}` : ''}، منشور على rcp.anpp.dz.`,
  })

  return (
    <div style={{ flexBasis: '100%', borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'grid', gap: 10 }}>
      {doses.length > 0 && (
        <Bloc icon="💊" accent="#2563eb" count={doses.length} title={pickLang(lang, { fr: 'Posologie indiquée dans le RCP', ar: 'الجرعات المذكورة في RCP' })}>
          <Doses doses={doses} pdfUrl={rcp.pdf_url} lang={lang} />
        </Bloc>
      )}
      {ci.length > 0 && (
        <Bloc icon="⛔" accent="#dc2626" count={ci.length} title={pickLang(lang, { fr: 'Contre-indications citées', ar: 'موانع الاستعمال المذكورة' })}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {ci.map(f => (
              <li key={f.id} style={{ ...row, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <span style={{ color: '#0f172a', fontWeight: 600, minWidth: 0 }}>{f.libelle}</span>
                <PageLink pdfUrl={rcp.pdf_url} f={f} lang={lang} />
              </li>
            ))}
          </ul>
        </Bloc>
      )}
      {gro.length > 0 && (
        <Bloc icon="🤰" accent="#db2777" count={gro.length} title={pickLang(lang, { fr: 'Grossesse et allaitement', ar: 'الحمل والرضاعة' })}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {gro.map(f => {
              const g = GRAVITE[f.gravite ?? 'non_precisee']
              return (
                <li key={f.id} style={{ ...row, justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', minWidth: 88 }}>{f.libelle === 'Allaitement' ? pickLang(lang, { fr: 'Allaitement', ar: 'الرضاعة' }) : pickLang(lang, { fr: 'Grossesse', ar: 'الحمل' })}</span>
                    <span style={{ background: g.bg, color: g.color, borderRadius: 5, padding: '0 7px', fontSize: 12, fontWeight: 700 }}>
                      {f.gravite === 'non_precisee' || !f.gravite ? pickLang(lang, { fr: 'Voir le RCP', ar: 'راجع RCP' }) : g[lang]}
                    </span>
                  </span>
                  <PageLink pdfUrl={rcp.pdf_url} f={f} lang={lang} />
                </li>
              )
            })}
          </ul>
        </Bloc>
      )}
      {inter.length > 0 && (
        <Bloc icon="⚠️" accent="#d97706" count={inter.length} title={pickLang(lang, { fr: 'Associations et interactions citées', ar: 'الارتباطات والتداخلات المذكورة' })}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {inter.map(f => {
              const g = GRAVITE[f.gravite ?? 'non_precisee']
              const href = f.cible_type === 'dci' && f.cible ? `/dci/${encodeURIComponent(f.cible.toLowerCase())}`
                : f.cible_type === 'classe' && f.cible ? `/classes-therapeutiques/${encodeURIComponent(f.cible)}` : null
              return (
                <li key={f.id} style={{ ...row, justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ background: g.bg, color: g.color, borderRadius: 5, padding: '0 7px', fontSize: 12, fontWeight: 700, minWidth: 88, textAlign: 'center' }}>
                      {g[lang]}
                    </span>
                    {href ? <Link href={href} style={{ ...link, fontWeight: 700 }}>{f.libelle}</Link> : <strong style={{ color: '#0f172a' }}>{f.libelle}</strong>}
                  </span>
                  <PageLink pdfUrl={rcp.pdf_url} f={f} lang={lang} />
                </li>
              )
            })}
          </ul>
        </Bloc>
      )}
      <p style={{ ...small, margin: 0, lineHeight: 1.6, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px' }}>
        {source}{' '}
        <a href={rcp.pdf_url} target="_blank" rel="noopener noreferrer" style={link}>
          {pickLang(lang, { fr: 'Ouvrir le PDF', ar: 'فتح PDF' })}
        </a>
        {'. '}
        {pickLang(lang, {
          fr: 'Repères relus par DwaDZ, à titre indicatif : seul le RCP complet fait foi. Consultez-le et un professionnel de santé.',
          ar: 'معالم راجعها فريق DwaDZ على سبيل الإرشاد فقط: المرجع الوحيد هو RCP الكامل. يُرجى الرجوع إليه واستشارة مختص صحي.',
        })}
      </p>
    </div>
  )
}

/**
 * RCP officiel(s) de la fiche. Le document s'ouvre sur le portail de l'ANPP :
 * DwaDZ n'en garde aucune copie, et dit d'où il vient. Les faits courts
 * (doses, contre-indications, grossesse, associations) ne s'affichent qu'une fois relus.
 */
export function RcpSection({ rcps, lang }: { rcps: RcpLink[]; lang: Lang }) {
  if (rcps.length === 0) return null
  return (
    <section id="rcp" style={{ marginTop: 40, scrollMarginTop: 16 }}>
      <h2 className="section-title">
        {pickLang(lang, { fr: '📄 RCP officiel', ar: '📄 ملخص خصائص المنتوج (RCP)' })}
      </h2>
      <div className="section-sub">
        {pickLang(lang, {
          fr: 'Résumé des caractéristiques du produit, publié par l\'ANPP. Le document s\'ouvre sur le portail officiel : DwaDZ n\'en conserve pas de copie.',
          ar: 'ملخص خصائص المنتوج كما نشرته الوكالة الوطنية للمنتجات الصيدلانية. يُفتح المستند على الموقع الرسمي، ولا يحتفظ DwaDZ بنسخة منه.',
        })}
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
        {rcps.map(r => (
          <div
            key={r.rcp_id}
            style={{
              background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 2px rgba(15,23,42,.04)',
              display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center',
            }}
          >
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{r.nom_commercial}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {[r.laboratoire_anpp, r.version_texte && pickLang(lang, { fr: `version ${r.version_texte}`, ar: `النسخة ${r.version_texte}` })].filter(Boolean).join(' · ')}
              </div>
            </div>
            <a
              href={r.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="fiche-btn"
              style={{ margin: 0, flex: '0 0 auto', padding: '8px 16px' }}
            >
              {pickLang(lang, { fr: 'Ouvrir le RCP (PDF) ↗', ar: 'فتح RCP (PDF) ↗' })}
            </a>
            <Faits rcp={r} lang={lang} />
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 10, lineHeight: 1.6 }}>
        {pickLang(lang, {
          fr: 'Rattachement à la fiche établi automatiquement à partir de la marque, de la substance et du laboratoire. Une erreur ? ',
          ar: 'تم ربط المستند بالبطاقة آليًا انطلاقًا من الاسم التجاري والمادة الفعالة والمخبر. هل من خطأ؟ ',
        })}
        <Link href="/contact" style={link}>
          {pickLang(lang, { fr: 'Écrivez-nous', ar: 'راسلنا' })}
        </Link>
        {' · '}
        <a href={RCP_PORTAL_URL} target="_blank" rel="noopener noreferrer" style={link}>
          {pickLang(lang, { fr: 'Chercher un autre RCP sur rcp.anpp.dz', ar: 'البحث عن RCP آخر في rcp.anpp.dz' })}
        </a>
      </p>
    </section>
  )
}
