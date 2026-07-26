'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { LaboSummary } from '@/lib/queries'
import { getCountryFlag } from '@/lib/countryFlag'
import { useLanguage } from '@/components/i18n/LanguageProvider'

interface Props {
  labos: LaboSummary[]
}

function LaboCard({ labo }: { labo: LaboSummary }) {
  return (
    <Link href={`/laboratoire/${labo.slug}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#fff', borderRadius: 12, padding: '16px 18px',
          border: '1.5px solid #e2e8f0', transition: 'border-color 0.15s, box-shadow 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.1)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
        }}
      >
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#0f172a',
          marginBottom: 8, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {labo.labo}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 600,
            padding: '3px 8px', borderRadius: 6,
          }}>
            💊 {labo.total_enregistres}
          </span>
          {labo.total_retraits > 0 && (
            <span style={{
              background: '#fff1f2', color: '#be123c', fontSize: 11, fontWeight: 600,
              padding: '3px 8px', borderRadius: 6,
            }}>
              🚨 {labo.total_retraits}
            </span>
          )}
          {labo.total_non_renouveles > 0 && (
            <span style={{
              background: '#fffbeb', color: '#b45309', fontSize: 11, fontWeight: 600,
              padding: '3px 8px', borderRadius: 6,
            }}>
              📋 {labo.total_non_renouveles}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function LaboratoiresClient({ labos }: Props) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => (lang === 'ar' ? ar : fr)
  const [search, setSearch] = useState('')
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set())

  // Flat filtered list (pour la recherche)
  const filtered = useMemo(() => {
    if (!search.trim()) return labos
    const q = search.toLowerCase()
    return labos.filter(l => l.labo.toLowerCase().includes(q))
  }, [labos, search])

  // Groupement par pays, trié par nom de pays puis nom de labo
  const groupedByCountry = useMemo(() => {
    const groups = new Map<string, LaboSummary[]>()
    const sorted = [...labos].sort((a, b) => {
      const ca = a.pays_origine ?? '\uFFFF'
      const cb = b.pays_origine ?? '\uFFFF'
      if (ca !== cb) return ca.localeCompare(cb, 'fr')
      return a.labo.localeCompare(b.labo, 'fr')
    })
    for (const labo of sorted) {
      const key = labo.pays_origine ?? 'Non renseigné'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(labo)
    }
    return groups
  }, [labos])

  const toggleCountry = (country: string) => {
    setOpenCountries(prev => {
      const next = new Set(prev)
      if (next.has(country)) next.delete(country)
      else next.add(country)
      return next
    })
  }

  const isSearching = search.trim().length > 0

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>🏭</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {t('Laboratoires pharmaceutiques', 'المخابر الصيدلانية')}
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: 15, margin: '0 0 20px' }}>
          {labos.length} {t('laboratoires référencés dans la nomenclature officielle MIPH — Algérie', 'مخبراً مسجلاً في التسمية الرسمية MIPH — الجزائر')}
        </p>

        {/* Search */}
        <input
          type="search"
          placeholder={t('Rechercher un laboratoire...', 'ابحث عن مخبر...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 420, padding: '10px 16px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none',
            background: '#f8fafc', color: '#0f172a',
          }}
        />
      </div>

      {/* Contact banner */}
      <div style={{
        background: '#f8fafc',
        borderRadius: 14,
        padding: '18px 24px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        border: '1.5px solid #e2e8f0',
      }}>
        <span style={{ fontSize: 28 }}>📩</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
            {t('Une mise à jour à proposer ?', 'لديكم تحديث تقترحونه؟')}
          </div>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            {t('Pour toute correction ou demande liée aux laboratoires, contactez directement notre équipe.', 'لأي تصحيح أو طلب متعلق بالمخابر، تواصلوا مباشرة مع فريقنا.')}
          </div>
        </div>
        <Link href="/contact" style={{
          background: '#3b82f6', color: '#fff', padding: '9px 20px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}>
          {t('Contacter →', 'اتصلوا بنا ←')}
        </Link>
      </div>

      {/* Stats summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 32,
      }}>
        {[
          { label: t('Laboratoires', 'المخابر'), value: labos.length, icon: '🏭' },
          { label: t('Pays représentés', 'البلدان الممثلة'), value: groupedByCountry.size, icon: '🌍' },
          { label: t('Produits enregistrés', 'المنتجات المسجلة'), value: labos.reduce((s, l) => s + l.total_enregistres, 0).toLocaleString('fr-DZ'), icon: '💊' },
          { label: t('Retraits cumulés', 'إجمالي السحوبات'), value: labos.reduce((s, l) => s + l.total_retraits, 0).toLocaleString('fr-DZ'), icon: '🚨' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#f8fafc', borderRadius: 12, padding: '16px 20px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Résultats de recherche (liste plate) */}
      {isSearching ? (
        filtered.length === 0 ? (
          <p style={{ color: '#475569', textAlign: 'center', padding: '40px 0' }}>
            {t('Aucun laboratoire trouvé pour', 'لم يُعثر على أي مخبر لـ')} &quot;{search}&quot;
          </p>
        ) : (
          <>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14 }}>
              {filtered.length} {lang === 'ar' ? 'نتيجة لـ' : `résultat${filtered.length > 1 ? 's' : ''} pour`} &quot;{search}&quot;
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}>
              {filtered.map(labo => <LaboCard key={labo.slug} labo={labo} />)}
            </div>
          </>
        )
      ) : (
        /* Accordéon par pays */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from(groupedByCountry.entries()).map(([country, countryLabos]) => {
            const flag = getCountryFlag(country)
            const isOpen = openCountries.has(country)
            return (
              <div key={country} style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                {/* En-tête pays */}
                <button
                  onClick={() => toggleCountry(country)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px', background: isOpen ? '#eff6ff' : '#f8fafc',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: isOpen ? '1px solid #dbeafe' : 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>
                    {flag || '🌍'}
                  </span>
                  <span style={{
                    flex: 1, fontWeight: 700, fontSize: 15, color: '#0f172a',
                  }}>
                    {country}
                  </span>
                  <span style={{
                    background: isOpen ? '#dbeafe' : '#e2e8f0',
                    color: isOpen ? '#1d4ed8' : '#64748b',
                    fontSize: 12, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 20,
                  }}>
                    {countryLabos.length} {lang === 'ar' ? 'مخبر' : `labo${countryLabos.length > 1 ? 's' : ''}`}
                  </span>
                  <span style={{ color: '#475569', fontSize: 14, marginLeft: 4 }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>

                {/* Liste des labos (dépliable) */}
                {isOpen && (
                  <div style={{
                    padding: '14px',
                    background: '#fafcff',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 10,
                  }}>
                    {countryLabos.map(labo => <LaboCard key={labo.slug} labo={labo} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
