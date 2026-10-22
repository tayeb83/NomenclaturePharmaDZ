import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { RCP_PORTAL_URL, type RcpLink } from '@/lib/rcp-core'

/**
 * RCP officiel(s) de la fiche. Le document s'ouvre sur le portail de l'ANPP :
 * DwaDZ n'en garde aucune copie, et dit d'où il vient.
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
                {[r.laboratoire_anpp, r.version_texte].filter(Boolean).join(' · ')}
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
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 10, lineHeight: 1.6 }}>
        {pickLang(lang, {
          fr: 'Rattachement à la fiche établi automatiquement à partir de la marque, de la substance et du laboratoire. Une erreur ? ',
          ar: 'تم ربط المستند بالبطاقة آليًا انطلاقًا من الاسم التجاري والمادة الفعالة والمخبر. هل من خطأ؟ ',
        })}
        <Link href="/contact" style={{ color: 'var(--blue)' }}>
          {pickLang(lang, { fr: 'Écrivez-nous', ar: 'راسلنا' })}
        </Link>
        {' · '}
        <a href={RCP_PORTAL_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
          {pickLang(lang, { fr: 'Chercher un autre RCP sur rcp.anpp.dz', ar: 'البحث عن RCP آخر في rcp.anpp.dz' })}
        </a>
      </p>
    </section>
  )
}
