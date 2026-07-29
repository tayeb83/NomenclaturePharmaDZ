import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getAtcNode, getAtcAncestors, getAtcChildrenWithCounts, getDcisByAtcPrefix } from '@/lib/queries'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 86400 // 24h

function isValidAtcCode(code: string): boolean {
  return /^[A-Z][0-9A-Z]{0,6}$/i.test(code)
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const code = params.code.toUpperCase()
  if (!isValidAtcCode(code)) return { title: 'Classe ATC introuvable' }
  const node = await getAtcNode(code)
  if (!node) return { title: 'Classe ATC introuvable' }

  const label = node.label_fr || node.label_en || code
  const canonical = `${APP_URL}/classes-therapeutiques/${code}`
  const title = `${code} — ${label} : médicaments en Algérie | DwaDZ`
  const description = `Classe thérapeutique ATC ${code} (${label}) : substances actives et médicaments enregistrés dans la nomenclature pharmaceutique algérienne (MIPH).`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', siteName: 'DwaDZ', locale: 'fr_DZ', url: canonical },
  }
}

export default async function AtcCodePage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()
  if (!isValidAtcCode(code)) notFound()

  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const node = await getAtcNode(code)
  if (!node) notFound()

  const [ancestors, children, dcis] = await Promise.all([
    getAtcAncestors(code),
    getAtcChildrenWithCounts(code),
    // Le listing complet des DCI n'a de sens qu'à partir du niveau 2
    // (au niveau 1 il ferait des centaines de lignes : on navigue par sous-classe).
    node.niveau >= 2 ? getDcisByAtcPrefix(code) : Promise.resolve([]),
  ])

  const label = node.label_fr || node.label_en || code

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div className="container">
          {/* Fil d'Ariane ATC */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
            <Link href="/classes-therapeutiques" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              {pickLang(lang, { fr: 'Classes ATC', ar: 'فئات ATC' })}
            </Link>
            {ancestors.map(a => (
              <span key={a.code} style={{ color: 'rgba(255,255,255,0.65)' }}>
                {' / '}
                <Link href={`/classes-therapeutiques/${a.code}`} style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
                  {a.code}
                </Link>
              </span>
            ))}
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{' / '}{node.code}</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 6 }}>
              {pickLang(lang, { fr: `CLASSIFICATION ATC — NIVEAU ${node.niveau}`, ar: `تصنيف ATC — المستوى ${node.niveau}` })}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'white', margin: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#7dd3fc' }}>{node.code}</span>
              {' — '}{label}
            </h1>
            {node.label_en && node.label_fr && node.label_en !== node.label_fr && (
              <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8, fontSize: 14, fontStyle: 'italic' }}>
                {node.label_en}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>

          {/* Sous-classes */}
          {children.length > 0 && (
            <>
              <div className="section-title">
                {pickLang(lang, { fr: '📂 Sous-classes', ar: '📂 الفئات الفرعية' })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginTop: 16, marginBottom: 36 }}>
                {children.map(child => (
                  <Link
                    key={child.code}
                    href={`/classes-therapeutiques/${child.code}`}
                    style={{
                      display: 'block', background: 'white', border: '1.5px solid #e2e8f0',
                      borderRadius: 10, padding: '14px 16px', textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: '#0284c7' }}>
                        {child.code}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {pickLang(lang, { fr: `${child.dci_count} DCI`, ar: `${child.dci_count} DCI` })}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5, marginTop: 4, lineHeight: 1.4 }}>
                      {child.label_fr || child.label_en || child.code}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Substances actives sous ce code */}
          {dcis.length > 0 && (
            <>
              <div className="section-title">
                {pickLang(lang, {
                  fr: `💊 Substances actives en Algérie (${dcis.length})`,
                  ar: `💊 المواد الفعالة في الجزائر (${dcis.length})`,
                })}
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12, background: 'white', marginTop: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {[
                        pickLang(lang, { fr: 'Code ATC', ar: 'رمز ATC' }),
                        pickLang(lang, { fr: 'Substance (DCI)', ar: 'المادة الفعالة (DCI)' }),
                        pickLang(lang, { fr: 'Libellé ATC', ar: 'تسمية ATC' }),
                        pickLang(lang, { fr: 'Spécialités', ar: 'الأدوية' }),
                      ].map(h => (
                        <th key={h} style={{ textAlign: 'start', padding: '10px 14px', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dcis.map(row => (
                      <tr key={`${row.code_atc}-${row.dci}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          <Link href={`/classes-therapeutiques/${row.code_atc}`} style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 700 }}>
                            {row.code_atc}
                          </Link>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Link href={`/dci/${encodeURIComponent(row.dci.toLowerCase())}`} style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>
                            {row.dci}
                          </Link>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>
                          {row.atc_label_fr || row.atc_label_en || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          {row.nb_produits > 0 ? (
                            <span className="badge badge-blue" style={{ fontSize: 11.5 }}>
                              {row.nb_produits} {pickLang(lang, { fr: 'enreg.', ar: 'مسجل' })}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {children.length === 0 && dcis.length === 0 && (
            <div className="alert-banner info" style={{ marginTop: 8 }}>
              {pickLang(lang, {
                fr: 'Aucune substance de la nomenclature algérienne n\'est encore mappée sous cette classe.',
                ar: 'لا توجد مادة من التسمية الجزائرية مرتبطة بهذه الفئة بعد.',
              })}
            </div>
          )}

          <div style={{ marginTop: 40 }}>
            <Link href="/classes-therapeutiques" style={{
              padding: '10px 20px', background: '#f1f5f9', color: '#334155',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              border: '1.5px solid #e2e8f0',
            }}>
              {pickLang(lang, { fr: '← Toutes les classes ATC', ar: '→ كل فئات ATC' })}
            </Link>
          </div>
        </div>
      </div>
      <AdInContent />
    </>
  )
}
