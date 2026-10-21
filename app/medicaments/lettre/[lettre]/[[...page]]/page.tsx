import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getLettreCounts, getMedicamentsByLettre } from '@/lib/queries'
import { medicamentPath } from '@/lib/medicament-url'
import {
  LETTRE_SLUGS,
  REPERTOIRE_PAGE_SIZE,
  isLettreSlug,
  lettreLabel,
  lettrePath,
} from '@/lib/repertoire'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 86400

type Params = { lettre: string; page?: string[] }

/** Numéro de page demandé, ou null si le segment est invalide. */
function parsePage(segments?: string[]): number | null {
  if (!segments || segments.length === 0) return 1
  if (segments.length > 1 || !/^\d+$/.test(segments[0])) return null
  return parseInt(segments[0], 10)
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = parsePage(params.page)
  if (!isLettreSlug(params.lettre) || page === null || page < 1) return { title: 'Page introuvable' }

  const label = lettreLabel(params.lettre)
  const suffix = page > 1 ? ` — page ${page}` : ''
  const title = `Médicaments commençant par ${label} en Algérie${suffix}`
  const description = `Répertoire alphabétique des médicaments enregistrés en Algérie dont le nom commence par ${label} : DCI, dosage, forme et laboratoire (nomenclature MIPH).`
  const canonical = `${APP_URL}${lettrePath(params.lettre, page)}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', siteName: 'DwaDZ', locale: 'fr_DZ', url: canonical },
  }
}

export default async function LettrePage({ params }: { params: Params }) {
  const page = parsePage(params.page)
  if (!isLettreSlug(params.lettre) || page === null || page < 1) notFound()
  // /a/1 et /a désigneraient la même page : une seule URL par contenu.
  if (page === 1 && params.page?.length) permanentRedirect(lettrePath(params.lettre))

  const counts = await getLettreCounts().catch(() => ({} as Record<string, number>))
  const total = counts[params.lettre] ?? 0
  const totalPages = Math.max(1, Math.ceil(total / REPERTOIRE_PAGE_SIZE))
  if (total === 0 || page > totalPages) notFound()

  const meds = await getMedicamentsByLettre(
    params.lettre,
    REPERTOIRE_PAGE_SIZE,
    (page - 1) * REPERTOIRE_PAGE_SIZE
  )
  const label = lettreLabel(params.lettre)

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 11px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none',
    border: '1.5px solid #e2e8f0', background: active ? '#0891b2' : 'white', color: active ? 'white' : '#334155',
  })

  return (
    <div className="container" style={{ maxWidth: 960, margin: '0 auto', padding: '40px 16px 80px' }}>
      <p style={{ fontSize: 13, margin: '0 0 12px' }}>
        <Link href="/medicaments" style={{ color: 'var(--blue)' }}>← Tous les médicaments</Link>
      </p>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
        Médicaments commençant par « {label} »
      </h1>
      <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
        {total} médicament{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''} en Algérie
        {totalPages > 1 ? ` — page ${page} sur ${totalPages}` : ''}. Cliquez sur un nom pour ouvrir la fiche
        (DCI, forme, dosage, laboratoire, génériques équivalents).
      </p>

      <nav aria-label="Index alphabétique" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        {LETTRE_SLUGS.filter(l => counts[l]).map(l => (
          <Link key={l} href={lettrePath(l)} style={chip(l === params.lettre)}>{lettreLabel(l)}</Link>
        ))}
      </nav>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {meds.map(med => (
          <li key={med.id}>
            <Link
              href={medicamentPath('enregistrement', med.id, med)}
              style={{ display: 'block', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', textDecoration: 'none' }}
            >
              <span style={{ display: 'block', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                {med.nom_marque}{med.dosage ? ` ${med.dosage}` : ''}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {[med.dci, med.forme].filter(Boolean).join(' — ')}
              </span>
              {med.labo && <span style={{ display: 'block', fontSize: 11, color: '#475569', marginTop: 4 }}>🏭 {med.labo}</span>}
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 28 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <Link key={n} href={lettrePath(params.lettre, n)} style={chip(n === page)} aria-current={n === page ? 'page' : undefined}>
              {n}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
