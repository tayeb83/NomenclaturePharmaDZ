import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { isLang, type Lang } from '@/lib/i18n'
import { MedicamentDetail, buildMedicamentMetadata } from './MedicamentDetail'

type Params = { source: string; id: string }

// Les métadonnées sont indexées par les robots, qui n'ont pas de cookie : on
// les fige sur la langue de la ROUTE. Faire dépendre le canonical du cookie
// ferait déclarer par l'URL française que la version de référence est l'arabe.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return buildMedicamentMetadata(params, 'fr')
}

export default async function MedicamentDetailPage({ params }: { params: Params }) {
  // L'affichage, lui, suit la préférence du visiteur (comportement inchangé).
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'
  return <MedicamentDetail params={params} lang={lang} />
}
