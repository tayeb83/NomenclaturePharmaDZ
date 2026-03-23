'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'

type AddedDrug = {
  id: number
  n_enreg: string | null
  dci: string | null
  nom_marque: string | null
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  annee: number | null
  source_version: string | null
}

type RemovedDrug = {
  id: number
  version_label: string
  n_enreg: string | null
  dci: string | null
  nom_marque: string | null
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
}

type SortField = 'nom' | 'labo' | 'pays' | 'date'
type SortOrder = 'asc' | 'desc'

function TypeBadge({ type }: { type: string | null }) {
  const colors: Record<string, string> = {
    GE: '#0284c7', Gé: '#0284c7', RE: '#16a34a', BIO: '#9333ea', I: '#ea580c',
  }
  if (!type) return null
  return (
    <span style={{
      background: colors[type] || '#64748b', color: 'white',
      padding: '1px 7px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
    }}>{type}</span>
  )
}

function StatutBadge({ statut }: { statut: string | null }) {
  if (!statut) return null
  const isLocal = statut === 'F'
  return (
    <span style={{
      background: isLocal ? '#dcfce7' : '#fef9c3', color: isLocal ? '#15803d' : '#854d0e',
      padding: '1px 7px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
    }}>
      {isLocal ? '🇩🇿 Local' : '🌍 Importé'}
    </span>
  )
}

function AddedDrugRow({ drug }: { drug: AddedDrug }) {
  return (
    <div style={{
      background: '#f0fdf4', border: '1px solid #86efac',
      borderRadius: 10, padding: '12px 16px', marginBottom: 8,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, color: '#16a34a', fontWeight: 700 }}>✅</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{drug.nom_marque || '—'}</span>
        {drug.dosage && <span style={{ color: '#64748b', fontSize: 12 }}>{drug.dosage}</span>}
        <TypeBadge type={drug.type_prod} />
        <StatutBadge statut={drug.statut} />
        {drug.annee && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
            📅 {drug.annee}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#475569' }}>
        <span style={{ fontWeight: 600 }}>DCI : </span>{drug.dci || '—'}
        {drug.forme && <> · <span style={{ fontWeight: 600 }}>Forme : </span>{drug.forme}</>}
        {drug.labo && <> · <span style={{ fontWeight: 600 }}>Labo : </span>{drug.labo}</>}
        {drug.pays && <> · <span style={{ fontWeight: 600 }}>Pays : </span>{drug.pays}</>}
      </div>
      {drug.n_enreg && (
        <div style={{ fontSize: 11, color: '#475569' }}>N° {drug.n_enreg}</div>
      )}
      <div style={{ marginTop: 4 }}>
        <Link
          href={`/medicament/enregistrement/${drug.id}`}
          style={{ fontSize: 11.5, color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
        >
          Voir la fiche →
        </Link>
      </div>
    </div>
  )
}

function RemovedDrugRow({ drug }: { drug: RemovedDrug }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fca5a5',
      borderRadius: 10, padding: '12px 16px', marginBottom: 8,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, color: '#dc2626', fontWeight: 700 }}>❌</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{drug.nom_marque || '—'}</span>
        {drug.dosage && <span style={{ color: '#64748b', fontSize: 12 }}>{drug.dosage}</span>}
        <TypeBadge type={drug.type_prod} />
        <StatutBadge statut={drug.statut} />
      </div>
      <div style={{ fontSize: 12, color: '#475569' }}>
        <span style={{ fontWeight: 600 }}>DCI : </span>{drug.dci || '—'}
        {drug.forme && <> · <span style={{ fontWeight: 600 }}>Forme : </span>{drug.forme}</>}
        {drug.labo && <> · <span style={{ fontWeight: 600 }}>Labo : </span>{drug.labo}</>}
        {drug.pays && <> · <span style={{ fontWeight: 600 }}>Pays : </span>{drug.pays}</>}
      </div>
      {drug.n_enreg && (
        <div style={{ fontSize: 11, color: '#475569' }}>N° {drug.n_enreg}</div>
      )}
    </div>
  )
}

function SortBar({
  sortField, sortOrder, onChange, showDate,
  t,
}: {
  sortField: SortField
  sortOrder: SortOrder
  onChange: (field: SortField) => void
  showDate: boolean
  t: (fr: string, ar: string) => string
}) {
  const fields: { key: SortField; label: string; labelAr: string }[] = [
    { key: 'nom', label: 'Nom', labelAr: 'الاسم' },
    { key: 'labo', label: 'Labo', labelAr: 'المخبر' },
    { key: 'pays', label: 'Pays', labelAr: 'البلد' },
    ...(showDate ? [{ key: 'date' as SortField, label: 'Année', labelAr: 'السنة' }] : []),
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
        {t('Trier par :', 'ترتيب حسب :')}
      </span>
      {fields.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: '1px solid',
            borderColor: sortField === f.key ? '#0284c7' : '#cbd5e1',
            background: sortField === f.key ? '#0284c7' : 'white',
            color: sortField === f.key ? 'white' : '#475569',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {t(f.label, f.labelAr)}
          {sortField === f.key && (
            <span style={{ fontSize: 10 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function DiffClient({
  latestVersion,
  previousVersion,
  addedDrugs,
  removedDrugs,
  addedCount,
  removedCount,
}: {
  latestVersion: string | null
  previousVersion: string | null
  addedDrugs: AddedDrug[]
  removedDrugs: RemovedDrug[]
  addedCount: number
  removedCount: number
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const [tab, setTab] = useState<'added' | 'removed'>('added')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('nom')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  function filterDrugs<T extends { nom_marque?: string | null; dci?: string | null; labo?: string | null }>(drugs: T[]): T[] {
    if (!search.trim()) return drugs
    const q = search.toLowerCase()
    return drugs.filter(d =>
      (d.nom_marque || '').toLowerCase().includes(q) ||
      (d.dci || '').toLowerCase().includes(q) ||
      (d.labo || '').toLowerCase().includes(q)
    )
  }

  function sortDrugs<T extends { nom_marque?: string | null; labo?: string | null; pays?: string | null; annee?: number | null }>(drugs: T[]): T[] {
    return [...drugs].sort((a, b) => {
      let valA: string | number | null = null
      let valB: string | number | null = null

      if (sortField === 'nom') { valA = a.nom_marque || ''; valB = b.nom_marque || '' }
      else if (sortField === 'labo') { valA = a.labo || ''; valB = b.labo || '' }
      else if (sortField === 'pays') { valA = a.pays || ''; valB = b.pays || '' }
      else if (sortField === 'date') { valA = a.annee ?? 0; valB = b.annee ?? 0 }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }
      const cmp = String(valA).localeCompare(String(valB), 'fr', { sensitivity: 'base' })
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }

  const filteredAdded = useMemo(() => sortDrugs(filterDrugs(addedDrugs)), [addedDrugs, search, sortField, sortOrder])
  const filteredRemoved = useMemo(() => sortDrugs(filterDrugs(removedDrugs)), [removedDrugs, search, sortField, sortOrder])

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>🔄 {t('Comparaison des versions', 'مقارنة الإصدارات')}</h1>
          <p>
            {latestVersion && previousVersion
              ? t(
                  `Différences entre ${previousVersion} et ${latestVersion}`,
                  `الفروق بين ${previousVersion} و ${latestVersion}`
                )
              : latestVersion
              ? t(`Version ${latestVersion} — première importation`, `الإصدار ${latestVersion} — أول استيراد`)
              : t('Aucune version disponible', 'لا يوجد إصدار متاح')}
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="container">

          {/* Résumé */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div style={{
              background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '20px 24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#16a34a' }}>{addedCount}</div>
              <div style={{ fontWeight: 700, color: '#166534', marginTop: 4 }}>
                ✅ {t('Médicaments ajoutés', 'أدوية مضافة')}
              </div>
              {latestVersion && (
                <div style={{ fontSize: 12, color: '#4ade80', marginTop: 4 }}>
                  {t(`dans la version ${latestVersion}`, `في الإصدار ${latestVersion}`)}
                </div>
              )}
            </div>

            <div style={{
              background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 12, padding: '20px 24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#dc2626' }}>{removedCount}</div>
              <div style={{ fontWeight: 700, color: '#991b1b', marginTop: 4 }}>
                ❌ {t('Médicaments supprimés', 'أدوية محذوفة')}
              </div>
              {previousVersion && (
                <div style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>
                  {t(`présents dans ${previousVersion}`, `موجودة في ${previousVersion}`)}
                </div>
              )}
            </div>
          </div>

          {/* Note si pas de données de suppression */}
          {removedCount === 0 && addedCount > 0 && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
              padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#92400e',
            }}>
              ℹ️ {t(
                'Les médicaments supprimés seront trackés automatiquement lors du prochain import de version.',
                'ستُتتبع الأدوية المحذوفة تلقائيًا عند الاستيراد التالي للإصدار.'
              )}
            </div>
          )}

          {/* Filtre de recherche */}
          {(addedCount > 0 || removedCount > 0) && (
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Filtrer par nom, DCI ou labo...', 'تصفية بالاسم أو DCI أو المخبر...')}
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1',
                  borderRadius: 8, fontSize: 14, outline: 'none',
                }}
              />
            </div>
          )}

          {/* Tris */}
          {(addedCount > 0 || removedCount > 0) && (
            <SortBar
              sortField={sortField}
              sortOrder={sortOrder}
              onChange={handleSort}
              showDate={tab === 'added'}
              t={t}
            />
          )}

          {/* Tabs */}
          <div className="filter-tabs" style={{ marginBottom: 20 }}>
            <button
              className={`filter-tab${tab === 'added' ? ' active' : ''}`}
              onClick={() => setTab('added')}
              style={{ color: tab === 'added' ? '#16a34a' : undefined }}
            >
              ✅ {t('Ajoutés', 'مضاف')} ({filteredAdded.length})
            </button>
            <button
              className={`filter-tab${tab === 'removed' ? ' active' : ''}`}
              onClick={() => setTab('removed')}
              style={{ color: tab === 'removed' ? '#dc2626' : undefined }}
            >
              ❌ {t('Supprimés', 'محذوف')} ({filteredRemoved.length})
            </button>
          </div>

          {/* Liste */}
          {tab === 'added' && (
            <div>
              {filteredAdded.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0' }}>
                  {addedCount === 0
                    ? t('Aucun médicament ajouté dans cette version.', 'لا يوجد دواء مضاف في هذا الإصدار.')
                    : t('Aucun résultat pour ce filtre.', 'لا توجد نتائج لهذا التصفية.')}
                </div>
              ) : (
                filteredAdded.map(d => <AddedDrugRow key={d.id} drug={d} />)
              )}
            </div>
          )}

          {tab === 'removed' && (
            <div>
              {filteredRemoved.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0' }}>
                  {removedCount === 0
                    ? t('Aucun médicament supprimé enregistré pour cette version.', 'لا يوجد دواء محذوف مسجل لهذا الإصدار.')
                    : t('Aucun résultat pour ce filtre.', 'لا توجد نتائج لهذا التصفية.')}
                </div>
              ) : (
                filteredRemoved.map(d => <RemovedDrugRow key={d.id} drug={d} />)
              )}
            </div>
          )}

          {/* Lien vers les pages liées */}
          {addedCount === 0 && removedCount === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p style={{ fontSize: 16, marginBottom: 8 }}>
                {t('Aucune donnée de comparaison disponible.', 'لا تتوفر بيانات مقارنة.')}
              </p>
              <p style={{ fontSize: 13 }}>
                {t(
                  'Les données de diff sont générées automatiquement lors de l\'import d\'une nouvelle version via l\'espace admin.',
                  'يتم إنشاء بيانات المقارنة تلقائيًا عند استيراد إصدار جديد عبر لوحة الإدارة.'
                )}
              </p>
              <Link
                href="/veille"
                style={{ display: 'inline-block', marginTop: 16, background: '#0284c7', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}
              >
                {t('Voir les nouveaux enregistrements →', '← عرض التسجيلات الجديدة')}
              </Link>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
