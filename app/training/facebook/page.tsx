import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { FacebookComplete } from '@/components/training/FacebookComplete'
import { trainingSecret } from '@/lib/training'
import { verifyPayload } from '@/lib/training/security.ts'
import '../training.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Finaliser la demande — Training', robots: { index: false, follow: false } }

export default async function TrainingFacebookPage() {
  const secret = trainingSecret()
  const raw = (await cookies()).get('tr_fb_profile')?.value
  const profile = secret ? verifyPayload<{ id: string; email: string }>(raw, secret) : null
  return <FacebookComplete email={profile?.email ?? null} />
}
