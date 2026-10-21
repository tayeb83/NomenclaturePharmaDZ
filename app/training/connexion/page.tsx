import type { Metadata } from 'next'
import { LoginScreen } from '@/components/training/LoginScreen'
import '../training.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Connexion — Training',
  robots: { index: false, follow: false },
  referrer: 'no-referrer', // le jeton ne doit jamais fuiter dans un en-tête Referer
}

export default function TrainingLoginPage({ searchParams }: { searchParams: { token?: string | string[] } }) {
  const raw = Array.isArray(searchParams.token) ? searchParams.token[0] : searchParams.token
  const token = typeof raw === 'string' && raw.length <= 200 ? raw : ''
  return <LoginScreen initialToken={token} />
}
