'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { KeyboardEvent } from 'react'
import type { SearchResult } from '@/lib/db-types'
import { getCountryFlag } from '@/lib/countryFlag'
import { useLanguage } from '@/components/i18n/LanguageProvider'

function buildWhatsAppUrl(drug: SearchResult, type: string, lang: 'fr' | 'ar'): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const ficheUrl = `${baseUrl}/medicament/${drug.source || type}/${drug.id}`
  let msg = ''
  if (type === 'retrait') {
    msg = `🚨 *${lang === 'ar' ? 'سحب' : 'RETRAIT'} — ${drug.nom_marque}* (${drug.dci})\n`
    if (drug.motif_retrait) msg += `${lang === 'ar' ? 'السبب' : 'Motif'} : ${drug.motif_retrait}\n`
    if (drug.date_retrait) msg += `${lang === 'ar' ? 'التاريخ' : 'Date'} : ${drug.date_retrait}\n`
  } else if (type === 'non_renouvele') {
    msg = `⚠️ *${lang === 'ar' ? 'عدم تجديد رخصة AMM' : 'AMM non renouvelée'} — ${drug.nom_marque}* (${drug.dci})\n`
    if (drug.date_final) msg += `${lang === 'ar' ? 'التاريخ النهائي' : 'Date finale'} : ${drug.date_final}\n`
  } else {
    msg = `💊 *${drug.nom_marque}* (${drug.dci})\n`
  }
  if (drug.forme || drug.dosage) msg += `${lang === 'ar' ? 'الشكل' : 'Forme'} : ${[drug.forme, drug.dosage].filter(Boolean).join(' ')}\n`
  if (drug.labo) msg += `${lang === 'ar' ? 'المخبر' : 'Labo'} : ${drug.labo}\n`
  msg += `\n🔗 ${lang === 'ar' ? 'البطاقة' : 'Fiche'} : ${ficheUrl}\n_Source : DwaDZ_`
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}

const TYPE_LABELS: Record<string, { fr: string; ar: string }> = {
  GE: { fr: 'Générique', ar: 'جنيس' }, 'Gé': { fr: 'Générique', ar: 'جنيس' }, RE: { fr: 'Référence', ar: 'مرجعي' },
  BIO: { fr: 'Biologique', ar: 'بيولوجي' }, I: { fr: 'Innovateur', ar: 'مبتكر' }, 'Ré': { fr: 'Référence', ar: 'مرجعي' },
}
const STATUT_LABELS: Record<string, { fr: string; ar: string }> = {
  F: { fr: '🇩🇿 Local', ar: '🇩🇿 محلي' }, I: { fr: '📦 Importé', ar: '📦 مستورد' },
}


export function DrugCard({
  drug,
  type,
  onOpen,
}: {
  drug: SearchResult
  type: string
  onOpen?: () => void
}) {
  const isRetrait = type === 'retrait'
  const isNonRenouv = type === 'non_renouvele'
  const { lang } = useLanguage()
  const router = useRouter()
  const href = `/medicament/${drug.source || type}/${drug.id}`

  const openDetails = () => {
    if (onOpen) onOpen()
    router.push(href)
  }

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetails()
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
      onClick={openDetails}
      onKeyDown={handleCardKeyDown}
    >
    <div className={`drug-card ${isRetrait ? 'retrait' : isNonRenouv ? 'non-renouvele' : 'enregistrement'}`} style={{ cursor: 'pointer' }}>
      <div className="drug-card-top">
        <div style={{ flex: 1 }}>
          <div className="drug-dci">DCI</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 3 }}>{drug.dci}</div>
          <div className="drug-name">{drug.nom_marque}</div>
        </div>
        <div className="drug-badges">
          {drug.type_prod && (
            <span className={`badge ${drug.type_prod === 'BIO' ? 'badge-purple' : drug.type_prod === 'RE' || drug.type_prod === 'Ré' ? 'badge-blue' : 'badge-green'}`}>
              {TYPE_LABELS[drug.type_prod]?.[lang] || drug.type_prod}
            </span>
          )}
          {drug.statut && (
            <span className={`badge ${drug.statut === 'F' ? 'badge-green' : 'badge-gray'}`}>
              {STATUT_LABELS[drug.statut]?.[lang] || drug.statut}
            </span>
          )}
          {drug.annee && (
            <span className="badge badge-amber">{lang === 'ar' ? 'تسجيل' : 'Enreg.'} {drug.annee}</span>
          )}
          {drug.code_atc && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 11,
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1.5px solid #bfdbfe',
              borderRadius: 5,
              padding: '1px 7px',
              letterSpacing: '.04em',
            }}>
              ATC {drug.code_atc}
            </span>
          )}
          {drug.is_critical && (
            <span className="badge badge-red">
              🚨 {lang === 'ar' ? 'حرج' : 'Critique'}
            </span>
          )}
          {isRetrait && <span className="badge badge-red">🚫 {lang === 'ar' ? 'مسحوب' : 'Retiré'}</span>}
          {isNonRenouv && <span className="badge badge-amber">⚠️ {lang === 'ar' ? 'غير مجدد' : 'Non renouvelé'}</span>}
        </div>
      </div>

      <div className="drug-meta">
        {drug.forme && <span>💊 <strong>{drug.forme}</strong>{drug.dosage ? ` — ${drug.dosage}` : ''}</span>}
        {drug.labo && (
          <span>
            🏭 {drug.labo}
            {drug.pays ? (
              <> ({getCountryFlag(drug.pays) ? `${getCountryFlag(drug.pays)} ` : ''}{drug.pays})</>
            ) : ''}
          </span>
        )}
      </div>

      {isRetrait && drug.motif_retrait && (
        <div className="drug-alert retrait">
          ⚠️ {drug.motif_retrait}
          {drug.date_retrait && <span style={{ fontWeight: 400, color: '#991b1b', marginLeft: 8 }}>({drug.date_retrait})</span>}
        </div>
      )}
      {isNonRenouv && drug.date_final && (
        <div className="drug-alert non-renouvele">
          📋 {lang === 'ar' ? 'انتهاء AMM — التاريخ النهائي' : 'AMM expirée — Date finale'} : {drug.date_final}
        </div>
      )}
      <div className="drug-card-footer">
        <button
          type="button"
          className="drug-whatsapp-btn"
          title={lang === 'ar' ? 'مشاركة عبر واتساب' : 'Partager via WhatsApp'}
          onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(buildWhatsAppUrl(drug, type, lang), '_blank', 'noopener,noreferrer') }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.624 0 12.017-5.392 12.02-12.018A11.92 11.92 0 0020.464 3.488z" />
          </svg>
          <span>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
        </button>

        <Link
          href={href}
          className="drug-detail-btn"
          onClick={(e) => {
            e.stopPropagation()
            if (onOpen) onOpen()
          }}
        >
          {lang === 'ar' ? 'عرض البطاقة' : 'Voir la fiche'}
        </Link>
      </div>
    </div>
    </div>
  )
}
