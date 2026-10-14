import { HubPage, hubMetadata } from '@/components/annuaire/pages'

export const revalidate = 300

export const metadata = hubMetadata('fr')

export default function PharmaciesPage() {
  return <HubPage lang="fr" />
}
