import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getAtcRootsWithCounts } from '@/lib/queries'
import { isLang, pickLang, type Lang } from '@/lib/i18n'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 86400 // 24h

export const metadata: Metadata = {
  title: 'Classes thérapeutiques (ATC) — médicaments en Algérie | DwaDZ',
  description: 'Naviguez dans la nomenclature pharmaceutique algérienne par classe thérapeutique : classification ATC de l\'OMS, du groupe anatomique jusqu\'à la substance active.',
  alternates: { canonical: `${APP_URL}/classes-therapeutiques` },
  openGraph: {
    title: 'Classes thérapeutiques (ATC) — médicaments en Algérie | DwaDZ',
    description: 'Classification ATC de l\'OMS appliquée à la nomenclature algérienne : naviguez par système anatomique et classe thérapeutique.',
    type: 'website',
    siteName: 'DwaDZ',
    locale: 'fr_DZ',
    url: `${APP_URL}/classes-therapeutiques`,
  },
}

const ATC_ICONS: Record<string, string> = {
  A: '🍽️', B: '🩸', C: '❤️', D: '🧴', G: '⚕️', H: '🧬', J: '🦠',
  L: '🎗️', M: '🦴', N: '🧠', P: '🪳', R: '🫁', S: '👁️', V: '📦',
}

export default async function ClassesTherapeutiquesPage() {
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'

  const roots = await getAtcRootsWithCounts()

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>🧬 {pickLang(lang, { fr: 'Classes thérapeutiques (ATC)', ar: 'الفئات العلاجية (ATC)' })}</h1>
          <p>
            {pickLang(lang, {
              fr: 'Classification ATC de l\'OMS appliquée à la nomenclature algérienne — naviguez du système anatomique jusqu\'à la substance active.',
              ar: 'تصنيف ATC لمنظمة الصحة العالمية مطبق على التسمية الجزائرية — تصفح من الجهاز التشريحي إلى المادة الفعالة.',
            })}
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>
          {roots.length === 0 ? (
            <div className="alert-banner info">
              {pickLang(lang, {
                fr: 'La classification ATC n\'est pas encore chargée dans la base. Importez-la via scripts/import_atc.py (voir README).',
                ar: 'تصنيف ATC غير محمّل بعد في قاعدة البيانات.',
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {roots.map(node => (
                <Link
                  key={node.code}
                  href={`/classes-therapeutiques/${node.code}`}
                  style={{
                    display: 'block', background: 'white', border: '1.5px solid #e2e8f0',
                    borderRadius: 12, padding: '18px 20px', textDecoration: 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 26 }}>{ATC_ICONS[node.code] ?? '💊'}</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18,
                      color: '#0284c7', background: '#f0f9ff', borderRadius: 8, padding: '2px 10px',
                    }}>
                      {node.code}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14.5, lineHeight: 1.4 }}>
                    {node.label_fr || node.label_en || node.code}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 8 }}>
                    {pickLang(lang, {
                      fr: `${node.dci_count} substance${node.dci_count > 1 ? 's' : ''} active${node.dci_count > 1 ? 's' : ''} en Algérie`,
                      ar: `${node.dci_count} مادة فعالة في الجزائر`,
                    })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
