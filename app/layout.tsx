import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { LanguageProvider } from '@/components/i18n/LanguageProvider'
import { PWAManager } from '@/components/pwa/PWAManager'
import { PageVisitTracker } from '@/components/analytics/PageVisitTracker'
import { getStats } from '@/lib/queries'
import { isAdminSessionValid } from '@/lib/admin-auth'
import { cookies, headers } from 'next/headers'
import { getDir, isLang } from '@/lib/i18n'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: { default: 'DwaDZ — Médicaments en Algérie', template: '%s | DwaDZ' },
  description: 'Moteur de recherche indépendant sur la Nomenclature Nationale des Produits Pharmaceutiques (MIPH). DwaDZ n\'est pas le site officiel — il offre une interface fluide et avancée sur les données publiées par le Ministère de l\'Industrie Pharmaceutique. البحث عن الأدوية في الجزائر.',
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
    title: 'DwaDZ',
  },
  openGraph: {
    title: 'DwaDZ — Médicaments en Algérie',
    description: 'Moteur de recherche indépendant sur la nomenclature pharmaceutique algérienne (données MIPH) — recherche avancée, alertes retraits, génériques.',
    url: APP_URL,
    siteName: 'DwaDZ',
    locale: 'fr_DZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DwaDZ — Médicaments en Algérie',
    description: 'Moteur de recherche indépendant sur la nomenclature pharmaceutique algérienne (données source MIPH) — recherche avancée, alertes, génériques.',
    site: '@pharmaveilledz',
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
  const cookieLang = cookieStore.get('lang')?.value

  // Les routes /ar/* ont une URL dédiée et doivent rester en arabe pour les
  // robots quel que soit le cookie de langue du visiteur — sinon Google
  // verrait un <html lang> incohérent avec le contenu qu'il vient d'indexer.
  const headerStore = await headers()
  const pathname = headerStore.get('x-pathname') || ''
  const initialLang = pathname.startsWith('/ar/') || pathname === '/ar'
    ? 'ar'
    : (isLang(cookieLang) ? cookieLang : 'fr')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DwaDZ',
    alternateName: ['DwaDZ… كلش على دوا البلاد', 'Pharma DZ', 'Pharmacie Algérie', 'Médicaments Algérie'],
    url: APP_URL,
    description: 'Moteur de recherche indépendant sur la Nomenclature Nationale des Produits Pharmaceutiques publiée par le MIPH. Recherche avancée, alertes retraits, génériques.',
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
      name: 'DwaDZ',
      url: APP_URL,
    },
  }

  return (
    <html lang={initialLang} dir={getDir(initialLang)} suppressHydrationWarning>
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
      <body suppressHydrationWarning>
        <LanguageProvider initialLang={initialLang}>
          <Nav currentVersion={currentVersion} isAdmin={isAdmin} />
          <main className="main-content">
            {children}
          </main>
          <Footer />
          <PWAManager />
          <PageVisitTracker />
        </LanguageProvider>
      </body>
    </html>
  )
}
