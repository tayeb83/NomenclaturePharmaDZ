'use client'

import { useLanguage } from '@/components/i18n/LanguageProvider'
import { getCopy } from '@/lib/training/copy'
import { LogoutButton } from './LogoutButton'

export function SpaceScreen({ email, role }: { email: string; role: 'etudiant' | 'enseignant' | 'pharmacien' }) {
  const { lang } = useLanguage()
  const c = getCopy(lang)
  return (
    <div className="tr-wrap tr-narrow">
      <h1 className="tr-wait-title">{c.space.title}</h1>
      <p>{c.space.welcome} <strong dir="ltr">{email}</strong> ({c.form.roles[role]})</p>
      <p className="tr-muted">{c.space.soon}</p>
      <LogoutButton />
    </div>
  )
}
