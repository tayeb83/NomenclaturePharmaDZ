import type { Metadata } from 'next'
import { MedicamentDetail, buildMedicamentMetadata } from '@/app/medicament/[source]/[id]/MedicamentDetail'

type Params = { source: string; id: string; slug?: string[] }

// Version arabe indexable de la fiche médicament. L'URL /ar/* force déjà
// lang="ar" et dir="rtl" au niveau du layout racine (via l'en-tête
// x-pathname posé par le middleware), indépendamment du cookie de langue.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return buildMedicamentMetadata(params, 'ar')
}

export default async function MedicamentDetailPageAr({ params }: { params: Params }) {
  return <MedicamentDetail params={params} lang="ar" routeLang="ar" />
}
