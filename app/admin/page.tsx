import { cookies } from 'next/headers'
import { isAdminSessionValid } from '@/lib/admin-auth'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  const cookieStore = cookies()
  const session = cookieStore.get('admin_session')?.value
  const isAuthenticated = isAdminSessionValid(session)

  return <AdminClient isAuthenticated={isAuthenticated} />
}
