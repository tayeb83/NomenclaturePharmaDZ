import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getLaboNameBySlug,
  getLaboStats,
  getLaboPortfolioDCI,
  getLaboProducts,
  laboToSlug,
} from '@/lib/queries'
import { LaboClient } from './LaboClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const laboName = await getLaboNameBySlug(params.slug)
  if (!laboName) return { title: 'Laboratoire introuvable' }

  const stats = await getLaboStats(laboName)
  const total = stats?.total_enregistres ?? 0

  return {
    title: `${laboName} — Portefeuille pharmaceutique Algérie`,
    description: `${laboName} : ${total} produits enregistrés dans la nomenclature algérienne (MIPH). Statistiques DCI, retraits, AMM non renouvelées, répartition local/importé.`,
    keywords: [
      laboName,
      `${laboName} médicaments algérie`,
      `${laboName} nomenclature MIPH`,
      `laboratoire pharmaceutique ${laboName}`,
    ],
    alternates: { canonical: `${APP_URL}/laboratoire/${params.slug}` },
    openGraph: {
      title: `${laboName} — Portefeuille pharmaceutique Algérie`,
      description: `${total} produits enregistrés — Nomenclature officielle MIPH.`,
      url: `${APP_URL}/laboratoire/${params.slug}`,
      type: 'website',
    },
  }
}

export const revalidate = 3600

export default async function LaboPage({ params }: Props) {
  const laboName = await getLaboNameBySlug(params.slug)
  if (!laboName) notFound()

  const [stats, portfolioDci, products] = await Promise.all([
    getLaboStats(laboName),
    getLaboPortfolioDCI(laboName, 30),
    getLaboProducts(laboName, 1000, 0),
  ])

  if (!stats) notFound()

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: laboName,
    description: `Laboratoire pharmaceutique enregistré en Algérie — ${stats.total_enregistres} produits dans la nomenclature MIPH`,
    ...(stats.pays_origine ? { addressCountry: stats.pays_origine } : {}),
    url: `${APP_URL}/laboratoire/${laboToSlug(laboName)}`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LaboClient
        labo={laboName}
        slug={params.slug}
        stats={stats}
        portfolioDci={portfolioDci}
        products={products}
      />
    </>
  )
}
