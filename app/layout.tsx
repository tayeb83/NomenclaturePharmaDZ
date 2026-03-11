import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { LanguageProvider } from '@/components/i18n/LanguageProvider'
import { PWAManager } from '@/components/pwa/PWAManager'
import { getStats } from '@/lib/queries'
import { isAdminSessionValid } from '@/lib/admin-auth'
import { cookies } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: { default: 'PharmaVeille DZ — Médicaments en Algérie', template: '%s | PharmaVeille DZ' },
  description: 'Trouvez n\'importe quel médicament en Algérie — nomenclature pharmaceutique officielle MIPH, alertes retraits, génériques, nouveaux enregistrements. البحث عن الأدوية في الجزائر.',
  keywords: [
    // Français
    'médicament algérie', 'pharmacie algérie', 'nomenclature pharmaceutique algérienne',
    'chercher médicament algérie', 'trouver médicament dz', 'médicament disponible algérie',
    'retrait médicament algérie', 'générique algérie', 'DCI algérie', 'MIPH',
    'pharmacien algérien', 'enregistrement médicament algérie', 'prix médicament algérie',
    'pharmacopée algérienne', 'médicament remboursé algérie', 'liste médicaments algérie',
    'médicament retiré algérie', 'AMM algérie', 'spécialité pharmaceutique algérie',
    // Arabe
    'دواء الجزائر', 'صيدلية الجزائر', 'قائمة الأدوية', 'أدوية مسجلة',
    'البحث عن دواء في الجزائر', 'اسم الدواء بالجزائر', 'أدوية متوفرة بالجزائر',
    'وزارة الصناعة الصيدلانية', 'التسمية الصيدلانية الجزائرية', 'دواء جنيس الجزائر',
    'سحب دواء الجزائر', 'صيدلاني جزائري',
  ],
  metadataBase: new URL(APP_URL),
  manifest: '/manifest.json',
  alternates: { canonical: APP_URL },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PharmaVeille DZ',
  },
  openGraph: {
    title: 'PharmaVeille DZ — Médicaments en Algérie',
    description: 'Trouvez n\'importe quel médicament en Algérie — nomenclature MIPH officielle, alertes et génériques.',
    url: APP_URL,
    siteName: 'PharmaVeille DZ',
    locale: 'fr_DZ',
    type: 'website',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PharmaVeille DZ',
    alternateName: 'فارما فيل DZ',
    url: APP_URL,
    description: 'Nomenclature pharmaceutique algérienne officielle — recherche, alertes retraits, génériques. التسمية الصيدلانية الجزائرية الرسمية.',
    inLanguage: ['fr', 'ar'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${APP_URL}/recherche?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PharmaVeille DZ',
      url: APP_URL,
    },
  }

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
        {/* Structured data JSON-LD pour Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google AdSense — activé uniquement si NEXT_PUBLIC_ADSENSE_CLIENT_ID est défini */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <LanguageProvider>
          <Nav currentVersion={currentVersion} isAdmin={isAdmin} />
          <main className="main-content">
            {children}
          </main>
          <Footer />
          <PWAManager />
        </LanguageProvider>
      </body>
    </html>
  )
}
