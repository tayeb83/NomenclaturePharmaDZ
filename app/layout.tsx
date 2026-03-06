import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { LanguageProvider } from '@/components/i18n/LanguageProvider'
import { getStats } from '@/lib/queries'
import { isAdminSessionValid } from '@/lib/admin-auth'
import { cookies } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: { default: 'PharmaVeille DZ', template: '%s | PharmaVeille DZ' },
  description: 'Nomenclature pharmaceutique algérienne — Recherche, alertes retraits, nouveaux enregistrements. Données officielles MIPH.',
  keywords: [
    'pharmacie algérie', 'médicament algérie', 'nomenclature pharmaceutique',
    'retrait médicament', 'DCI', 'MIPH', 'pharmacien algérien',
    'enregistrement médicament', 'دواء الجزائر', 'صيدلية',
  ],
  metadataBase: new URL(APP_URL),
  manifest: '/manifest.json',
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PharmaVeille DZ',
  },
  openGraph: {
    title: 'PharmaVeille DZ',
    description: 'La référence pour les pharmaciens algériens — Données officielles MIPH',
    url: APP_URL,
    siteName: 'PharmaVeille DZ',
    locale: 'fr_DZ',
    type: 'website',
  },
}

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Récupère la version courante côté serveur pour l'afficher dans la Nav
  let currentVersion: string | null = null
  try {
    const stats = await getStats()
    currentVersion = stats.last_version ?? null
  } catch {
    // Silencieux : la nav affiche le fallback si la DB est inaccessible
  }

  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  const isAdmin = isAdminSessionValid(session)

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap" rel="stylesheet" />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <LanguageProvider>
          <Nav currentVersion={currentVersion} isAdmin={isAdmin} />
          <main className="main-content">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  )
}
