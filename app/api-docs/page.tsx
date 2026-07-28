import type { Metadata } from 'next'
import Link from 'next/link'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const metadata: Metadata = {
  title: 'Documentation API — DwaDZ',
  description: 'Documentation complète de l\'API publique DwaDZ. Accédez à la nomenclature pharmaceutique algérienne via une API REST.',
  alternates: { canonical: `${APP_URL}/api-docs` },
}

type Param = {
  name: string
  type: string
  required: boolean
  description: string
  example?: string
}

type Endpoint = {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  description: string
  params?: Param[]
  responseExample: string
  note?: string
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/medicaments',
    description: 'Liste paginée de tous les médicaments enregistrés en Algérie.',
    params: [
      { name: 'page', type: 'integer', required: false, description: 'Numéro de page (défaut : 1)', example: '1' },
      { name: 'limit', type: 'integer', required: false, description: 'Résultats par page, max 100 (défaut : 50)', example: '50' },
      { name: 'type_prod', type: 'string', required: false, description: 'Filtre par type : GE (Générique), I (Innovateur), RE (Référence), BIO (Biologique)', example: 'GE' },
      { name: 'statut', type: 'string', required: false, description: 'Filtre par statut : F (Fabriqué en Algérie), I (Importé)', example: 'F' },
      { name: 'pays', type: 'string', required: false, description: 'Filtre par pays (recherche partielle)', example: 'France' },
      { name: 'annee', type: 'integer', required: false, description: 'Filtre par année d\'enregistrement', example: '2024' },
    ],
    responseExample: `{
  "data": [
    {
      "id": 1234,
      "n_enreg": "1234-DZ-2022",
      "dci": "AMOXICILLINE",
      "nom_marque": "AMOXIL 500",
      "forme": "Gélule",
      "dosage": "500 mg",
      "labo": "GSK",
      "pays": "Algérie",
      "type_prod": "GE",
      "statut": "F",
      "annee": 2022,
      "date_init": "2022-01-15",
      "date_final": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12500,
    "totalPages": 250,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "type_prod": null,
    "statut": null,
    "pays": null,
    "annee": null
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/search',
    description: 'Recherche full-text dans la nomenclature pharmaceutique (enregistrements, retraits, non-renouvelés).',
    params: [
      { name: 'q', type: 'string', required: false, description: 'Terme de recherche (DCI, nom de marque, forme, dosage, laboratoire)', example: 'amoxicilline' },
      { name: 'scope', type: 'string', required: false, description: 'Périmètre : all (défaut), enregistrement, retrait, non_renouvele', example: 'all' },
      { name: 'labo', type: 'string', required: false, description: 'Filtre par laboratoire', example: 'Saidal' },
      { name: 'substance', type: 'string', required: false, description: 'Filtre par DCI (substance active)', example: 'paracétamol' },
      { name: 'activeOnly', type: 'boolean', required: false, description: 'Retourne uniquement les médicaments actifs (1 pour activer)', example: '1' },
      { name: 'algerieOnly', type: 'boolean', required: false, description: 'Uniquement les médicaments fabriqués en Algérie (1 pour activer)', example: '1' },
      { name: 'limit', type: 'integer', required: false, description: 'Nombre maximum de résultats (défaut : 50)', example: '20' },
    ],
    responseExample: `{
  "results": [
    {
      "id": 5678,
      "source": "enregistrement",
      "dci": "PARACÉTAMOL",
      "nom_marque": "EFFERALGAN 500",
      "forme": "Comprimé effervescent",
      "dosage": "500 mg",
      "labo": "UPSA",
      "pays": "France",
      "type_prod": "RE",
      "statut": "I",
      "annee": 2020,
      "code_atc": "N02BE01"
    }
  ],
  "count": 1,
  "query": "paracétamol",
  "scope": "all"
}`,
  },
  {
    method: 'GET',
    path: '/api/stats',
    description: 'Statistiques générales de la nomenclature (totaux, dernière mise à jour).',
    responseExample: `{
  "total_enregistrements": 12500,
  "total_nouveautes": 342,
  "total_retraits": 89,
  "total_non_renouveles": 156,
  "last_version": "2026-02"
}`,
  },
]

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  POST: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  DELETE: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const colors = METHOD_COLORS[endpoint.method]
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 24,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          fontSize: 12,
          padding: '3px 10px',
          borderRadius: 6,
          background: colors.bg,
          color: colors.text,
          border: `1.5px solid ${colors.border}`,
          letterSpacing: '.04em',
        }}>
          {endpoint.method}
        </span>
        <code style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 15,
          fontWeight: 600,
          color: '#0f172a',
        }}>
          {endpoint.path}
        </code>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: endpoint.params ? 20 : 0, lineHeight: 1.6 }}>
          {endpoint.description}
        </p>
        {endpoint.note && (
          <div style={{
            background: '#fefce8',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: '#854d0e',
            marginBottom: 20,
          }}>
            ⚠️ {endpoint.note}
          </div>
        )}

        {endpoint.params && endpoint.params.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '.08em', marginBottom: 10, textTransform: 'uppercase' }}>
              Paramètres
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Paramètre</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Requis</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.params.map((p, i) => (
                    <tr key={p.name} style={{ borderBottom: i < endpoint.params!.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#0284c7' }}>{p.name}</code>
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top', color: '#64748b', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {p.type}
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        {p.required ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 6px' }}>requis</span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 6px' }}>optionnel</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top', color: '#475569', lineHeight: 1.5 }}>
                        {p.description}
                        {p.example && (
                          <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                            Ex : <code style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>{p.example}</code>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Response example */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '.08em', marginBottom: 10, textTransform: 'uppercase' }}>
            Exemple de réponse
          </div>
          <pre style={{
            background: '#0f172a',
            color: '#e2e8f0',
            borderRadius: 8,
            padding: '16px 20px',
            fontSize: 12,
            lineHeight: 1.7,
            overflowX: 'auto',
            fontFamily: 'var(--font-mono)',
          }}>
            {endpoint.responseExample}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default function ApiDocsPage() {
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', padding: '48px 0 40px' }}>
        <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 6,
              background: 'rgba(2,132,199,0.2)',
              color: '#38bdf8',
              border: '1.5px solid rgba(56,189,248,0.3)',
              letterSpacing: '.08em',
            }}>
              REST API
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>v1.0</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 12, fontFamily: 'var(--font-display)' }}>
            Documentation API
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 580, lineHeight: 1.6 }}>
            API publique de la nomenclature pharmaceutique algérienne (MIPH).
            Données en lecture seule, mise à jour mensuelle.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginTop: 20,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 16px',
          }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Base URL :</span>
            <code style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{APP_URL}</code>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Info banner */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 36,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
          <div style={{ fontSize: 14, color: '#1e40af', lineHeight: 1.6 }}>
            <strong>API publique et gratuite.</strong> Aucune clé d&apos;authentification requise.
            Les données proviennent de la nomenclature officielle du Ministère de l&apos;Industrie Pharmaceutique (MIPH).
            Format de réponse : <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>application/json</code>.
          </div>
        </div>

        {/* Endpoints */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '.1em', marginBottom: 20, textTransform: 'uppercase' }}>
          Endpoints disponibles
        </div>

        {endpoints.map((ep) => (
          <EndpointCard key={ep.path} endpoint={ep} />
        ))}

        {/* Footer note */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '20px 24px',
          marginTop: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Codes de réponse HTTP</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { code: '200', label: 'OK', desc: 'Requête traitée avec succès' },
              { code: '400', label: 'Bad Request', desc: 'Paramètres invalides' },
              { code: '500', label: 'Internal Server Error', desc: 'Erreur serveur' },
            ].map(({ code, label, desc }) => (
              <div key={code} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: code === '200' ? '#15803d' : '#dc2626', minWidth: 34 }}>{code}</code>
                <span style={{ color: '#475569', fontWeight: 600, minWidth: 140 }}>{label}</span>
                <span style={{ color: '#94a3b8' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link href="/medicaments" style={{ color: '#0284c7', fontSize: 14, textDecoration: 'none' }}>
            ← Retour à la liste des médicaments
          </Link>
        </div>
      </div>
    </div>
  )
}
