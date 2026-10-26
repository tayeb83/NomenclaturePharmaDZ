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

function Faits({ rcp, lang }: { rcp: RcpLink; lang: Lang }) {
  // `?? []` : une fiche déjà en cache avant l'ajout des faits n'a pas ce champ
  const faits = rcp.faits ?? []
  const doses = faits.filter(f => f.type === 'dose')
  const inter = faits.filter(f => f.type === 'interaction')
  if (doses.length + inter.length === 0) return null

  const source = pickLang(lang, {
    fr: `Source : RCP de ${rcp.laboratoire_anpp ?? rcp.nom_commercial}${rcp.version_texte ? `, version ${rcp.version_texte}` : ''}, publié sur rcp.anpp.dz.`,
    ar: `المصدر: RCP الخاص بـ ${rcp.laboratoire_anpp ?? rcp.nom_commercial}${rcp.version_texte ? `، النسخة ${rcp.version_texte}` : ''}، منشور على rcp.anpp.dz.`,
  })

  return (
    <div style={{ flexBasis: '100%', borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'grid', gap: 12 }}>
      {doses.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
            {pickLang(lang, { fr: 'Posologie indiquée dans le RCP', ar: 'الجرعات المذكورة في RCP' })}
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {doses.map(f => (
              <li key={f.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'baseline', fontSize: 14 }}>
                <span style={{ ...small, minWidth: 88 }}>{POPULATION[f.population ?? 'non_precisee'][lang]}</span>
                <strong style={{ color: '#0f172a' }}>{f.libelle}</strong>
                <PageLink pdfUrl={rcp.pdf_url} f={f} lang={lang} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {inter.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
            {pickLang(lang, { fr: 'Associations et interactions citées', ar: 'الارتباطات والتداخلات المذكورة' })}
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 5 }}>
            {inter.map(f => {
              const g = GRAVITE[f.gravite ?? 'non_precisee']
              const href = f.cible_type === 'dci' && f.cible ? `/dci/${encodeURIComponent(f.cible.toLowerCase())}`
                : f.cible_type === 'classe' && f.cible ? `/classes-therapeutiques/${encodeURIComponent(f.cible)}` : null
              return (
                <li key={f.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'baseline', fontSize: 14 }}>
                  <span style={{ background: g.bg, color: g.color, borderRadius: 5, padding: '0 7px', fontSize: 12, fontWeight: 700, minWidth: 88, textAlign: 'center' }}>
                    {g[lang]}
                  </span>
                  {href ? <Link href={href} style={{ ...link, fontWeight: 700 }}>{f.libelle}</Link> : <strong style={{ color: '#0f172a' }}>{f.libelle}</strong>}
                  <PageLink pdfUrl={rcp.pdf_url} f={f} lang={lang} />
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <p style={{ ...small, margin: 0, lineHeight: 1.6 }}>
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
 * (doses, associations) ne s'affichent qu'une fois relus.
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
              background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 16px',
              display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center',
            }}
          >
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{r.nom_commercial}</div>
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
