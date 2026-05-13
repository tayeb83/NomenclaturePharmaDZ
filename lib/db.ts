/**
 * DwaDZ — Client PostgreSQL direct (sans Supabase)
 * Fonctionne en local et sur n'importe quel hébergeur PostgreSQL
 * (Railway, Render, Neon, ElephantSQL, Heroku, etc.)
 */

import { Pool, types as pgTypes, type QueryResult } from 'pg'

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
      "Configuration PostgreSQL manquante: définissez DATABASE_URL (ou POSTGRES_URL) pour connecter l'application à la nomenclature."
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
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Retourner les dates comme strings (pas comme objets Date JS)
    types: {
      getTypeParser: (oid: number, format?: 'text' | 'binary') => {
        // 1082=date, 1114=timestamp, 1184=timestamptz
        if (oid === 1082 || oid === 1114 || oid === 1184) {
          return (val: string) => val // garder comme string
        }
        return pgTypes.getTypeParser(oid, format)
      },
    },
    // Réduit à 5 pour les environnements serverless (évite d'épuiser les connexions DB)
    max: 5,
    idleTimeoutMillis: 30000,
    // Augmenté pour absorber les pics de latence réseau (DB distante)
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  })
}

let pool: Pool | undefined = globalForPg._pgPool

export function getPool(): Pool {
  if (pool) return pool

  pool = createPool()
  // Toujours cacher dans globalThis pour éviter les recréations sur hot-reload (dev) et cold-starts (prod)
  globalForPg._pgPool = pool
  return pool
}

// Helper typé pour les requêtes
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect()
  try {
    const result: QueryResult<any> = await client.query(text, params)
    return result.rows
  } finally {
    client.release()
  }
}

// Helper pour une seule ligne (retourne null si introuvable)
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

// Helper avec statement_timeout PostgreSQL — utilisé pour les recherches qui peuvent être longues.
// Utilise BEGIN/SET LOCAL/COMMIT pour que le timeout ne se propage pas aux autres sessions du pool.
export async function queryWithTimeout<T = any>(text: string, params?: any[], timeoutMs = 9000): Promise<T[]> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL statement_timeout = ${Math.floor(timeoutMs)}`)
    const result: QueryResult<any> = await client.query(text, params)
    await client.query('COMMIT')
    return result.rows
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

export type {
  AtcCode,
  CriticalMedicament,
  Enregistrement,
  MedicamentDetail,
  NonRenouvele,
  Retrait,
  SearchResult,
  Stats,
} from './db-types'
