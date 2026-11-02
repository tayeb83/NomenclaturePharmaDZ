import type { Metadata } from 'next'
import { listPubliques, type DemandePublique } from '@/lib/demandes'
import { DemandesPublicClient } from './DemandesPublicClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const metadata: Metadata = {
  title: 'Médicaments recherchés en ce moment',
  description:
    "Médicaments que des patients cherchent actuellement en Algérie. Vous avez l'un d'eux en stock ? Écrivez-nous : DwaDZ met en relation, sans rien vendre.",
  alternates: { canonical: `${APP_URL}/demandes` },
  openGraph: {
    title: 'Médicaments recherchés en ce moment — DwaDZ',
    description: "Des patients cherchent ces médicaments. Pharmaciens : signalez-nous votre stock.",
    url: `${APP_URL}/demandes`,
  },
}

// Mise à jour toutes les 5 minutes suffit : les demandes changent au rythme d'un email.
export const revalidate = 300

export default async function DemandesPage() {
  let actives: DemandePublique[] = []
  let trouvees: DemandePublique[] = []
  try {
    ;({ actives, trouvees } = await listPubliques())
  } catch (err) {
    // Table absente (migration 35 non appliquée) ou base indisponible : page vide plutôt qu'une erreur.
    console.error('[demandes] lecture impossible:', err)
  }
  return (
    <DemandesPublicClient
      actives={actives}
      trouvees={trouvees}
      facebookUrl={process.env.NEXT_PUBLIC_FACEBOOK_PAGE_URL || null}
    />
  )
}
