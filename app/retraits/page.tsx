import { redirect } from 'next/navigation'
import { getAllRetraitAnnees } from '@/lib/queries'

export const revalidate = 3600

export default async function RetraitsIndex() {
  const annees = await getAllRetraitAnnees()
  const latest = annees[0] ?? new Date().getFullYear()
  redirect(`/retraits/${latest}`)
}
