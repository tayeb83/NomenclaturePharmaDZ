import { cookies } from 'next/headers'
import { getAdminSessionInfo } from '@/lib/admin-auth'
import LoginForm from '../LoginForm'
import DemandesClient from './DemandesClient'

export const dynamic = 'force-dynamic'

export default async function AdminDemandesPage() {
  const cookieStore = await cookies()
  const session = getAdminSessionInfo(cookieStore.get('admin_session')?.value)
  if (!session) return <LoginForm />
  return <DemandesClient />
}
