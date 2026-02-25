import type { SearchResult } from '@/lib/db'

const TYPE_LABELS: Record<string, string> = {
  GE: 'Générique', 'Gé': 'Générique', RE: 'Référence',
  BIO: 'Biologique', I: 'Innovateur', 'Ré': 'Référence'
}
const STATUT_LABELS: Record<string, string> = {
  F: 'Fabriqué en Algérie', I: 'Importé'
}

function motifColor(m: string | null) {
  if (!m) return '#6b7280'
  if (m.includes('INTERDICTION')) return '#dc2626'
  if (m.includes('COMMERCIAL')) return '#f59e0b'
  if (m.includes("PAYS D'ORIGINE")) return '#7c3aed'
  return '#6b7280'
}

export function DrugCard({ drug, type }: { drug: SearchResult; type: string }) {
  const isRetrait = type === 'retrait'
  const isNonRenouv = type === 'non_renouvele'

  return (
    <div className={`drug-card ${isRetrait ? 'retrait' : isNonRenouv ? 'non-renouvele' : 'enregistrement'}`}>
      <div className="drug-card-top">
        <div style={{ flex: 1 }}>
          <div className="drug-dci">DCI</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 3 }}>{drug.dci}</div>
          <div className="drug-name">{drug.nom_marque}</div>
        </div>
        <div className="drug-badges">
          {drug.type_prod && (
            <span className={`badge ${drug.type_prod === 'BIO' ? 'badge-purple' : drug.type_prod === 'RE' || drug.type_prod === 'Ré' ? 'badge-blue' : 'badge-green'}`}>
              {TYPE_LABELS[drug.type_prod] || drug.type_prod}
            </span>
          )}
          {drug.statut && (
            <span className={`badge ${drug.statut === 'F' ? 'badge-green' : 'badge-purple'}`}>
              {STATUT_LABELS[drug.statut] || drug.statut}
            </span>
          )}
          {drug.annee && (
            <span className="badge badge-amber">Enreg. {drug.annee}</span>
          )}
          {isRetrait && <span className="badge badge-red">🚫 Retiré</span>}
          {isNonRenouv && <span className="badge badge-amber">⚠️ Non renouvelé</span>}
        </div>
      </div>

      <div className="drug-meta">
        {drug.forme && <span>💊 <strong>{drug.forme}</strong>{drug.dosage ? ` — ${drug.dosage}` : ''}</span>}
        {drug.labo && <span>🏭 {drug.labo}{drug.pays ? ` (${drug.pays})` : ''}</span>}
      </div>

      {isRetrait && drug.motif_retrait && (
        <div className="drug-alert retrait">
          ⚠️ {drug.motif_retrait}
          {drug.date_retrait && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>({drug.date_retrait})</span>}
        </div>
      )}
      {isNonRenouv && drug.date_final && (
        <div className="drug-alert non-renouvele">
          📋 AMM expirée — Date finale : {drug.date_final}
        </div>
      )}
    </div>
  )
}
