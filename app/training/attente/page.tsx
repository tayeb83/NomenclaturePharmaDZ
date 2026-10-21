import type { Metadata } from 'next'
import { WaitingScreen } from '@/components/training/WaitingScreen'
import '../training.css'

export const metadata: Metadata = {
  title: 'Demande envoyée — Training',
  robots: { index: false, follow: false },
}

export default function TrainingWaitingPage() {
  return <WaitingScreen />
}
