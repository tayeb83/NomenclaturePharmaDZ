import { cookies } from 'next/headers'
import { getAdminSessionInfo } from '@/lib/admin-auth'
import LoginForm from '../LoginForm'
import ImportClient from '../AdminClient'

export const dynamic = 'force-dynamic'

export default async function ImportPage({ searchParams }: { searchParams: { tab?: string } }) {
  const cookieStore = await cookies()
  const session = getAdminSessionInfo(cookieStore.get('admin_session')?.value)
  if (!session) return <LoginForm />
  if (session.role === 'editor') {
    return <div className="adm-page"><div className="adm-card">L’import de la nomenclature est réservé aux administrateurs.</div></div>
  }
  const tab = searchParams.tab === 'archive' || searchParams.tab === 'analytics' ? searchParams.tab : 'upload'
  return <ImportClient initialTab={tab} />
}
