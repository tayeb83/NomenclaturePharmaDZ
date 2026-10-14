import { HubPage, hubMetadata } from '@/components/annuaire/pages'

export const revalidate = 300

export const metadata = hubMetadata('ar')

export default function PharmaciesPageAr() {
  return <HubPage lang="ar" />
}
