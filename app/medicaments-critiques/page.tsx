import Link from 'next/link'
import type { CSSProperties } from 'react'
import { getCriticalMedicaments } from '@/lib/queries'

export const metadata = {
  title: 'Médicaments critiques — PharmaVeille DZ',
  description: 'Liste des médicaments critiques (DCI + forme + dosage) publiée par les autorités sanitaires.',
}

export default async function MedicamentsCritiquesPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const q = (searchParams?.q || '').trim()
  const rows = await getCriticalMedicaments(q, 800)

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1 className="section-title">🚨 Médicaments critiques</h1>
          <p className="section-subtitle">
            Référentiel DCI + forme + dosage utilisé pour marquer automatiquement les médicaments critiques.
          </p>
          <form method="GET" style={{ marginTop: 12, maxWidth: 560 }}>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Ex: PARACETAMOL, INJ, 10MG/ML"
              className="search-input"
            />
          </form>
          <div style={{ marginTop: 10, fontSize: 13, color: '#475569' }}>
            {rows.length} résultat(s){q ? ` pour « ${q} »` : ''}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 1100 }}>
          {rows.length === 0 ? (
            <div className="empty-state">
              <h3>Aucun médicament critique trouvé.</h3>
              <p>Importe d&apos;abord la liste critique, puis relance la recherche.</p>
              <Link href="/admin" className="btn-primary" style={{ marginTop: 8, display: 'inline-flex' }}>
                Ouvrir l&apos;admin
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={th}>DCI</th>
                    <th style={th}>Forme</th>
                    <th style={th}>Dosage</th>
                    <th style={th}>Classe thérapeutique</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td style={td}>{row.dci}</td>
                      <td style={td}>{row.forme}</td>
                      <td style={td}>{row.dosage}</td>
                      <td style={td}>{row.classe_therapeutique || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const th: CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e2e8f0',
  fontWeight: 700,
  color: '#0f172a',
}

const td: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
}
