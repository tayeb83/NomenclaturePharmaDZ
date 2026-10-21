import { cookies } from 'next/headers'
import Link from 'next/link'
import { isAdminSessionValid } from '@/lib/admin-auth'
import { QuestionsAdminClient } from './QuestionsAdminClient'
import '../../../training/training.css'

export const dynamic = 'force-dynamic'

export default async function AdminTrainingQuestionsPage() {
  const cookieStore = await cookies()
  if (!isAdminSessionValid(cookieStore.get('admin_session')?.value)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>Accès restreint.</p>
          <Link href="/admin" style={{ color: '#38bdf8' }}>Se connecter →</Link>
        </div>
      </div>
    )
  }
  return <QuestionsAdminClient />
}
