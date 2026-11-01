import { cookies } from 'next/headers'
import { getAdminSessionInfo } from '@/lib/admin-auth'
import LoginForm from '../LoginForm'
import ComptesClient from './ComptesClient'

export const dynamic = 'force-dynamic'

export default async function ComptesPage() {
  const cookieStore = await cookies()
  const session = getAdminSessionInfo(cookieStore.get('admin_session')?.value)
  if (!session) return <LoginForm />
  if (session.role === 'editor') {
    return <div className="adm-page"><div className="adm-card">La gestion des comptes est réservée aux administrateurs.</div></div>
  }
  return <ComptesClient isOwner={session.role === 'owner'} selfId={session.accountId ?? null} />
}
