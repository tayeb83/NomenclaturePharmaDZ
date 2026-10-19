import type { Metadata } from 'next'
import { getGardeCoverage, buildWilayaHub } from '@/lib/garde'
import { GardeWilayaView, loadWilayaPage } from '../GardeWilayaView'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 300

type Params = { wilaya: string }

export async function generateStaticParams() {
  const hub = buildWilayaHub(await getGardeCoverage())
  return hub.map(w => ({ wilaya: w.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { wilaya: slug } = await params
  const { wilaya } = await loadWilayaPage(slug)
  const frUrl = `${APP_URL}/pharmacie-de-garde/${slug}`
  const arUrl = `${APP_URL}/ar/pharmacie-de-garde/${slug}`
  const title = `Pharmacie de garde ${wilaya.name_fr} – aujourd'hui, cette nuit`
  const description = `Pharmacies de garde à ${wilaya.name_fr} : liste du jour avec adresses, téléphones et horaires, d'après les listes officielles de la DSP, mise à jour quotidiennement.`
  return {
    title,
    description,
    // Une wilaya sans programme importé n'a pas de contenu propre : on évite
    // d'indexer une page vide.
    robots: wilaya.covered ? undefined : { index: false, follow: true },
    alternates: { canonical: frUrl, languages: { fr: frUrl, ar: arUrl, 'x-default': frUrl } },
    openGraph: { title, description, url: frUrl, type: 'website', locale: 'fr_DZ' },
  }
}

export default async function GardeWilayaPage({ params }: { params: Promise<Params> }) {
  const { wilaya } = await params
  return <GardeWilayaView data={await loadWilayaPage(wilaya)} lang="fr" />
}
