import type { Metadata } from 'next'
import { MedicamentsClient } from './MedicamentsClient'
import Link from 'next/link'
import { AdHorizontal } from '@/components/ads/AdBanner'
import { getLettreCounts } from '@/lib/queries'
import { LETTRE_SLUGS, lettreLabel, lettrePath } from '@/lib/repertoire'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const metadata: Metadata = {
  title: 'Tous les médicaments en Algérie',
  description: 'Liste complète et paginée de tous les médicaments enregistrés en Algérie. Nomenclature officielle MIPH — noms de marque, DCI, laboratoires, formes, dosages.',
  keywords: [
    'liste médicaments algérie', 'nomenclature médicaments algériens', 'tous les médicaments dz',
    'médicaments enregistrés algérie', 'DCI algérie', 'génériques algérie',
    'liste pharmacopée algérienne', 'MIPH médicaments', 'قائمة الأدوية الجزائر',
  ],
  alternates: { canonical: `${APP_URL}/medicaments` },
  openGraph: {
    title: 'Tous les médicaments enregistrés en Algérie',
    description: 'Nomenclature pharmaceutique algérienne complète — liste paginée avec filtres (type, statut, année), nouveautés de version et médicaments retirés par année.',
    url: `${APP_URL}/medicaments`,
    type: 'website',
  },
}

export default async function MedicamentsPage() {
  // Liste A–Z rendue côté serveur : la liste filtrable ci-dessous est chargée
  // en JavaScript, et ne donne donc aucun lien de fiche aux robots.
  const counts = await getLettreCounts().catch(() => ({} as Record<string, number>))
  const lettres = LETTRE_SLUGS.filter(l => counts[l])

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      {/* En-tête */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: '#0f172a' }}>
          💊 Tous les médicaments
        </h1>
        <p style={{ color: '#64748b', fontSize: 16, maxWidth: 620, lineHeight: 1.6 }}>
          Nomenclature pharmaceutique officielle algérienne (MIPH). Liste complète des médicaments enregistrés,
          filtrables par type, statut de fabrication, année, nouveautés de la version courante et médicaments retirés par année.
        </p>
      </div>

      {/* Publicité entre l'en-tête et la liste */}
      <AdHorizontal slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_MEDICAMENTS || '0000000000'} />

      {lettres.length > 0 && (
        <nav aria-label="Répertoire alphabétique" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
            Parcourir par ordre alphabétique
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {lettres.map(l => (
              <Link
                key={l}
                href={lettrePath(l)}
                title={`${counts[l]} médicaments commençant par ${lettreLabel(l)}`}
                style={{ padding: '6px 11px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1.5px solid #e2e8f0', background: 'white', color: '#334155' }}
              >
                {lettreLabel(l)}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <MedicamentsClient />
    </div>
  )
}
