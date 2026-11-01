import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import '../globals.css'
import './admin.css'
import { getAdminSessionInfo } from '@/lib/admin-auth'
import { getSidebarCounts } from '@/lib/admin-dashboard'
import AdminShell from './AdminShell'

export const metadata: Metadata = {
  title: 'Administration — DwaDZ',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = getAdminSessionInfo(cookieStore.get('admin_session')?.value)
  const counts = session ? await getSidebarCounts() : null

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="adm-body">
        {session && counts ? (
          <AdminShell user={{ name: session.name, email: session.email, role: session.role }} counts={counts}>
            {children}
          </AdminShell>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
