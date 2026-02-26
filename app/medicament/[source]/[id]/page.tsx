import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMedicamentById, getAlternatifsDCI, getAtcHierarchyByDci } from '@/lib/queries'
import type { Metadata } from 'next'
import type { MedicamentDetail, AtcCode } from '@/lib/db'

const TYPE_LABELS: Record<string, string> = {
  GE: 'Générique', 'Gé': 'Générique', RE: 'Référence étrangère',
  BIO: 'Biologique', I: 'Innovateur', 'Ré': 'Référence étrangère',
}
const STATUT_LABELS: Record<string, string> = {
  F: 'Fabriqué en Algérie', I: 'Importé',
}

function motifColor(m: string | null) {
  if (!m) return '#6b7280'
  if (m.includes('INTERDICTION')) return '#dc2626'
  if (m.includes('COMMERCIAL')) return '#f59e0b'
  if (m.includes("PAYS D'ORIGINE")) return '#7c3aed'
  return '#6b7280'
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value}</div>
    </div>
  )
}

export async function generateMetadata(
  { params }: { params: { source: string; id: string } }
): Promise<Metadata> {
  const id = parseInt(params.id)
  if (isNaN(id)) return { title: 'Médicament introuvable' }
  const med = await getMedicamentById(params.source, id)
  if (!med) return { title: 'Médicament introuvable' }
  return {
    title: `${med.nom_marque} — ${med.dci} | PharmaVeille DZ`,
    description: `Fiche détaillée de ${med.nom_marque} (${med.dci})${med.forme ? ` — ${med.forme}` : ''}${med.labo ? ` — ${med.labo}` : ''}`,
  }
}

export default async function MedicamentDetailPage(
  { params }: { params: { source: string; id: string } }
) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const med = await getMedicamentById(params.source, id)
  if (!med) notFound()

  const isRetrait = med.source === 'retrait'
  const isNonRenouv = med.source === 'non_renouvele'

  const [alternatifs, atcHierarchy] = await Promise.all([
    getAlternatifsDCI(med.dci, 10),
    getAtcHierarchyByDci(med.dci),
  ])
  const autres = alternatifs.filter(a => !(med.source === 'enregistrement' && a.id === med.id))
  const atcLevel5 = atcHierarchy.find(a => a.niveau === 5)

  const headerBg = isRetrait
    ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
    : isNonRenouv
    ? 'linear-gradient(135deg, #78350f, #b45309)'
    : 'linear-gradient(135deg, #0f172a, #0c2340)'

  const statusBadge = isRetrait
    ? { label: '🚫 Médicament retiré', bg: '#fee2e2', color: '#991b1b' }
    : isNonRenouv
    ? { label: '⚠️ AMM non renouvelée', bg: '#fef3c7', color: '#92400e' }
    : { label: '✅ Médicament actif', bg: '#d1fae5', color: '#065f46' }

  return (
    <>
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ background: headerBg }}>
        <div className="container">
          <Link href="/recherche" className="detail-back-link">
            ← Retour à la recherche
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.06em', marginBottom: 4 }}>
                DCI — DÉNOMINATION COMMUNE INTERNATIONALE
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>{med.dci}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>
                {med.nom_marque}
              </h1>
              {(med.forme || med.dosage) && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>
                  {[med.forme, med.dosage].filter(Boolean).join(' — ')}
                </div>
              )}
            </div>
            <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: statusBadge.bg, color: statusBadge.color, flexShrink: 0, marginTop: 4 }}>
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Body ───────────────────────────────────────────── */}
      <div className="page-body">
        <div className="container" style={{ maxWidth: 960 }}>

          {/* Alerte retrait */}
          {isRetrait && med.motif_retrait && (
            <div className="alert-banner error" style={{ borderColor: motifColor(med.motif_retrait), color: motifColor(med.motif_retrait), background: '#fef2f2', marginBottom: 24 }}>
              <strong>Motif de retrait :</strong> {med.motif_retrait}
              {med.date_retrait && <span style={{ marginLeft: 12, fontWeight: 400, color: '#9ca3af' }}>({med.date_retrait})</span>}
            </div>
          )}
          {isNonRenouv && med.date_final && (
            <div className="alert-banner warning" style={{ marginBottom: 24 }}>
              <strong>AMM expirée :</strong> Date de fin de validité — {med.date_final}
            </div>
          )}

          <div className="detail-grid">
            {/* ─── Identification ──────────────────────────── */}
            <div className="detail-card">
              <div className="detail-card-title">🔖 Identification</div>
              <Field label="DCI (Substance active)" value={med.dci} />
              <Field label="Nom de marque" value={med.nom_marque} />
              <Field label="N° d'enregistrement" value={med.n_enreg} />
              <Field label="Code produit" value={med.code} />
              {/* ─── Code ATC inline dans identification si disponible ─ */}
              {med.code_atc && (
                <div className="detail-field">
                  <div className="detail-field-label">Code ATC</div>
                  <div className="detail-field-value">
                    <span style={{
                      display: 'inline-block',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: 13,
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '2px 10px',
                      letterSpacing: '.04em',
                    }}>
                      {med.code_atc}
                    </span>
                    {(med.atc_label_fr || med.atc_label_en) && (
                      <span style={{ marginLeft: 8, color: '#475569', fontSize: 13 }}>
                        {med.atc_label_fr || med.atc_label_en}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {med.type_prod && (
                <div className="detail-field">
                  <div className="detail-field-label">Type de produit</div>
                  <div className="detail-field-value">
                    <span className={`badge ${med.type_prod === 'BIO' ? 'badge-purple' : med.type_prod === 'RE' || med.type_prod === 'Ré' ? 'badge-blue' : 'badge-green'}`}>
                      {TYPE_LABELS[med.type_prod] || med.type_prod}
                    </span>
                  </div>
                </div>
              )}
              {med.statut && (
                <div className="detail-field">
                  <div className="detail-field-label">Origine de fabrication</div>
                  <div className="detail-field-value">
                    <span className={`badge ${med.statut === 'F' ? 'badge-green' : 'badge-purple'}`}>
                      {STATUT_LABELS[med.statut] || med.statut}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Conditionnement ─────────────────────────── */}
            <div className="detail-card">
              <div className="detail-card-title">💊 Conditionnement</div>
              <Field label="Forme pharmaceutique" value={med.forme} />
              <Field label="Dosage" value={med.dosage} />
              <Field label="Conditionnement" value={med.conditionnement} />
              <Field label="Liste" value={med.liste} />
              <Field label="Prescription" value={med.prescription} />
              {med.stabilite && <Field label="Stabilité" value={med.stabilite} />}
            </div>

            {/* ─── Fabricant ────────────────────────────────── */}
            <div className="detail-card">
              <div className="detail-card-title">🏭 Fabricant</div>
              <Field label="Laboratoire" value={med.labo} />
              <Field label="Pays d'origine" value={med.pays} />
            </div>

            {/* ─── Dates & Version ─────────────────────────── */}
            <div className="detail-card">
              <div className="detail-card-title">📅 Dates & Enregistrement</div>
              <Field label="Date d'enregistrement" value={med.date_init} />
              {!isRetrait && <Field label="Date de fin de validité" value={med.date_final} />}
              {med.annee && <Field label="Année de nomenclature" value={String(med.annee)} />}
              <Field label="Version source" value={med.source_version} />
              {med.is_new_vs_previous === true && (
                <div className="detail-field">
                  <div className="detail-field-value">
                    <span className="badge badge-amber">Nouvelle inscription</span>
                  </div>
                </div>
              )}
              {isRetrait && (
                <>
                  <Field label="Date de retrait" value={med.date_retrait} />
                  <Field label="Motif de retrait" value={med.motif_retrait} />
                </>
              )}
            </div>

            {/* ─── Observations (si présentes) ─────────────── */}
            {med.obs && (
              <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
                <div className="detail-card-title">📝 Observations</div>
                <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.7 }}>{med.obs}</div>
              </div>
            )}
          </div>

          {/* ─── Classification ATC ──────────────────────────── */}
          {atcHierarchy.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="section-title">🧬 Classification ATC</div>
              <div className="section-sub">
                Anatomical Therapeutic Chemical — Classification OMS
              </div>
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: 10,
                padding: '16px 20px',
                marginTop: 12,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 0,
              }}>
                {atcHierarchy.map((level, idx) => (
                  <div key={level.code} style={{ display: 'flex', alignItems: 'center' }}>
                    {idx > 0 && (
                      <span style={{ color: '#94a3b8', fontSize: 16, margin: '0 6px' }}>›</span>
                    )}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: level.niveau === 5 ? 800 : 600,
                        fontSize: level.niveau === 5 ? 14 : 12,
                        color: level.niveau === 5 ? '#1d4ed8' : '#64748b',
                        background: level.niveau === 5 ? '#eff6ff' : 'transparent',
                        border: level.niveau === 5 ? '1.5px solid #bfdbfe' : 'none',
                        borderRadius: level.niveau === 5 ? 5 : 0,
                        padding: level.niveau === 5 ? '1px 7px' : '0',
                        letterSpacing: '.05em',
                      }}>
                        {level.code}
                      </span>
                      <span style={{
                        fontSize: 10,
                        color: level.niveau === 5 ? '#1e40af' : '#94a3b8',
                        maxWidth: 140,
                        lineHeight: 1.3,
                        marginTop: 2,
                      }}>
                        {level.label_fr || level.label_en || ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Médicaments similaires (même DCI) ───────────── */}
          {autres.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div className="section-title">🔁 Autres médicaments avec la même DCI</div>
              <div className="section-sub">{autres.length} médicament(s) enregistré(s) contenant <strong>{med.dci}</strong></div>
              <div className="detail-alt-grid">
                {autres.map(a => (
                  <Link
                    key={a.id}
                    href={`/medicament/enregistrement/${a.id}`}
                    className="detail-alt-card"
                  >
                    <div className="detail-alt-name">{a.nom_marque}</div>
                    {(a.forme || a.dosage) && (
                      <div className="detail-alt-meta">{[a.forme, a.dosage].filter(Boolean).join(' — ')}</div>
                    )}
                    {a.labo && <div className="detail-alt-meta">🏭 {a.labo}{a.pays ? ` (${a.pays})` : ''}</div>}
                    <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {a.type_prod && (
                        <span className={`badge ${a.type_prod === 'BIO' ? 'badge-purple' : a.type_prod === 'RE' || a.type_prod === 'Ré' ? 'badge-blue' : 'badge-green'}`}>
                          {TYPE_LABELS[a.type_prod] || a.type_prod}
                        </span>
                      )}
                      {a.statut && (
                        <span className={`badge ${a.statut === 'F' ? 'badge-green' : 'badge-purple'}`}>
                          {a.statut === 'F' ? 'Algérie' : 'Importé'}
                        </span>
                      )}
                      {a.annee && <span className="badge badge-amber">{a.annee}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ─── Actions ─────────────────────────────────────── */}
          <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/recherche" style={{
              padding: '10px 20px', background: '#f1f5f9', color: '#334155',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              border: '1.5px solid #e2e8f0', transition: 'all .15s',
            }}>
              ← Retour à la recherche
            </Link>
            <Link href={`/recherche?q=${encodeURIComponent(med.dci)}`} style={{
              padding: '10px 20px', background: '#0284c7', color: 'white',
              borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none',
              transition: 'all .15s',
            }}>
              🔍 Tous les médicaments avec cette DCI
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
