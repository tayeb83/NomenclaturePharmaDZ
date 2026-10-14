import { FichePage, ficheMetadata } from '@/components/annuaire/pages'

export const revalidate = 300

type Props = { params: { idslug: string } }

export const generateMetadata = ({ params }: Props) => ficheMetadata('ar', params.idslug)

export default function Page({ params }: Props) {
  return <FichePage lang="ar" param={params.idslug} />
}
