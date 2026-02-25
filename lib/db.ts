/**
 * PharmaVeille DZ — Client PostgreSQL direct (sans Supabase)
 * Fonctionne en local et sur n'importe quel hébergeur PostgreSQL
 * (Railway, Render, Neon, ElephantSQL, Heroku, etc.)
 */

import { Pool, type QueryResult } from 'pg'

// Pool de connexions — réutilisé entre les requêtes en dev et prod
const globalForPg = globalThis as unknown as { _pgPool?: Pool }

function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL
  )
}

function hasSplitPgConfig(): boolean {
  return Boolean(
    process.env.PGHOST ||
    process.env.PGPORT ||
    process.env.PGDATABASE ||
    process.env.PGUSER ||
    process.env.PGPASSWORD
  )
}

function createPool() {
  const connectionString = getConnectionString()

  if (!connectionString && !hasSplitPgConfig()) {
    throw new Error(
      'Configuration PostgreSQL manquante: définissez DATABASE_URL (ou POSTGRES_URL) pour connecter l\'application à la nomenclature.'
    )
  }

  return new Pool({
    connectionString,
    // Variables séparées si DATABASE_URL n'est pas disponible
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
    // Retourner les dates comme strings (pas comme objets Date JS)
    types: {
      getTypeParser: (oid: number, format?: string) => {
        // 1082=date, 1114=timestamp, 1184=timestamptz
        if (oid === 1082 || oid === 1114 || oid === 1184) {
          return (val: string) => val  // garder comme string
        }
        const { types } = require('pg')
        return types.getTypeParser(oid, format)
      }
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
}

// En dev, Next.js recharge les modules → on réutilise le pool existant
export const pool = globalForPg._pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalForPg._pgPool = pool

// Helper typé pour les requêtes
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result: QueryResult<any> = await client.query(text, params)
    return result.rows
  } finally {
    client.release()
  }
}

// Helper pour une seule ligne (retourne null si introuvable)
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

// ─── Types ────────────────────────────────────────────────────
export type Enregistrement = {
  id: number
  n_enreg: string
  code: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  liste: string | null
  prescription: string | null
  labo: string | null
  pays: string | null
  date_init: string | null
  date_final: string | null
  type_prod: string | null
  statut: string | null
  stabilite: string | null
  annee: number | null
  source_version: string | null
  is_new_vs_previous: boolean | null
}

export type Retrait = {
  id: number
  n_enreg: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  date_retrait: string | null
  motif_retrait: string | null
}

export type NonRenouvele = {
  id: number
  n_enreg: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  date_final: string | null
}

export type SearchResult = {
  source: 'enregistrement' | 'retrait' | 'non_renouvele'
  id: number
  n_enreg: string | null
  dci: string
  nom_marque: string
  forme: string | null
  dosage: string | null
  labo: string | null
  pays: string | null
  type_prod: string | null
  statut: string | null
  annee: number | null
  date_retrait: string | null
  motif_retrait: string | null
  date_final: string | null
}

export type Stats = {
  total_enregistrements: number
  total_nouveautes: number
  total_retraits: number
  total_non_renouveles: number
  fabriques_algerie: number
  dci_uniques: number
  abonnes_newsletter: number
  last_version: string | null
}
