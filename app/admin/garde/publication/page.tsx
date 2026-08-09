import { cookies } from 'next/headers'
import Link from 'next/link'
import { isAdminSessionValid } from '@/lib/admin-auth'
import { PublicationClient } from './PublicationClient'

export const dynamic = 'force-dynamic'

export default async function AdminGardePublicationPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  const isAuthenticated = isAdminSessionValid(session)

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>Accès restreint.</p>
          <Link href="/admin" style={{ color: '#38bdf8' }}>Se connecter →</Link>
        </div>
      </div>
    )
  }

  return <PublicationClient />
}
