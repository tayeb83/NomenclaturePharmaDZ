import { getDiffData } from '@/lib/queries'
import { DiffClient } from './DiffClient'
import { isAdminSessionValid } from '@/lib/admin-auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Diff — Comparaison des versions' }
export const revalidate = 0

export default async function DiffPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (!isAdminSessionValid(session)) {
    redirect('/admin')
  }

  const data = await getDiffData()

  return (
    <DiffClient
      latestVersion={data.latestVersion}
      previousVersion={data.previousVersion}
      addedDrugs={data.addedDrugs}
      removedDrugs={data.removedDrugs}
      addedCount={data.addedCount}
      removedCount={data.removedCount}
    />
  )
}
