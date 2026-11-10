import type { Metadata } from 'next'
import { exigerLab } from '@/lib/lab-access'
import { LabClient } from './LabClient'

export const metadata: Metadata = {
  title: 'Lab',
  description: 'Fonctions expérimentales de DwaDZ.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function LabPage() {
  exigerLab()
  return <LabClient />
}
