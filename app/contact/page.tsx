import type { Metadata } from 'next'
import { ContactClient } from './ContactClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez DwaDZ — questions, suggestions, signalement d\'erreurs sur la nomenclature pharmaceutique algérienne.',
  alternates: { canonical: `${APP_URL}/contact` },
  openGraph: {
    title: 'Contact | DwaDZ',
    description: 'Contactez-nous pour toute question sur les médicaments en Algérie.',
    url: `${APP_URL}/contact`,
  },
}

export default function ContactPage() {
  return <ContactClient />
}
