import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

// La page d'aide est un composant client : elle ne peut pas exporter ses
// propres métadonnées. Sans ce layout, elle héritait de celles de la racine —
// dont, auparavant, un canonical pointant vers la page d'accueil.
export const metadata: Metadata = {
  title: "Aide — comment utiliser DwaDZ",
  description:
    "Guide d'utilisation de DwaDZ : rechercher un médicament dans la nomenclature algérienne, trouver un générique équivalent, suivre les retraits et localiser une pharmacie de garde.",
  alternates: { canonical: `${APP_URL}/help` },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
