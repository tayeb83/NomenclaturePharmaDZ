import { PlacePage, placeMetadata } from '@/components/annuaire/pages'

export const revalidate = 300

type Props = { params: { wilaya: string } }

export const generateMetadata = ({ params }: Props) => placeMetadata('ar', params.wilaya)

export default function Page({ params }: Props) {
  return <PlacePage lang="ar" wilayaSlug={params.wilaya} />
}
