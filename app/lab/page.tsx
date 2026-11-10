import type { Metadata } from 'next'
import { LabClient } from './LabClient'

export const metadata: Metadata = {
  title: 'Lab',
  description: 'Fonctions expérimentales de DwaDZ.',
  robots: { index: false, follow: false },
}

export default function LabPage() {
  return <LabClient />
}
