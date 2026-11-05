import { cookies } from 'next/headers'
import { getAdminSessionInfo } from '@/lib/admin-auth'
import LoginForm from '../LoginForm'
import GrapheAdminClient from './GrapheAdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminGraphePage() {
  const cookieStore = await cookies()
  const session = getAdminSessionInfo(cookieStore.get('admin_session')?.value)
  if (!session) return <LoginForm />
  if (session.role === 'editor') {
    return <div className="adm-page"><div className="adm-card">L’activation des abonnements est réservée aux administrateurs.</div></div>
  }
  return <GrapheAdminClient />
}
