'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'

export function LogoutButton() {
  const { lang } = useLanguage()
  const router = useRouter()
  async function logout() {
    await fetch('/api/training/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/training')
    router.refresh()
  }
  return <button type="button" className="tr-btn tr-btn-primary" onClick={logout}>{getCopy(lang).space.logout}</button>
}
