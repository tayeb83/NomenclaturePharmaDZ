import type { Metadata } from 'next'
import { getGardeCoverage, buildWilayaHub } from '@/lib/garde'
import { GardeWilayaView, loadWilayaPage } from '@/app/pharmacie-de-garde/GardeWilayaView'

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
  const name = wilaya.name_ar || wilaya.name_fr
  const frUrl = `${APP_URL}/pharmacie-de-garde/${slug}`
  const arUrl = `${APP_URL}/ar/pharmacie-de-garde/${slug}`
  const title = `صيدلية المناوبة ${name} – اليوم وهذه الليلة`
  const description = `صيدليات المناوبة في ${name}: قائمة اليوم مع العناوين وأرقام الهاتف وأوقات المناوبة، من القوائم الرسمية لمديرية الصحة والسكان.`
  return {
    title,
    description,
    robots: wilaya.covered ? undefined : { index: false, follow: true },
    alternates: { canonical: arUrl, languages: { fr: frUrl, ar: arUrl, 'x-default': frUrl } },
    openGraph: { title, description, url: arUrl, type: 'website', locale: 'ar_DZ' },
  }
}

export default async function GardeWilayaPageAr({ params }: { params: Promise<Params> }) {
  const { wilaya } = await params
  return <GardeWilayaView data={await loadWilayaPage(wilaya)} lang="ar" />
}
