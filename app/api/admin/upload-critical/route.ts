import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { checkAdminAuth } from '@/lib/admin-auth'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60

type CriticalRow = {
  dci: string
  forme: string
  dosage: string
  classe_therapeutique: string | null
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function pick(row: Record<string, string>, candidates: string[]): string {
  for (const key of candidates) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function parseCriticalRows(buffer: Buffer): CriticalRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []

  const sheet = workbook.Sheets[firstSheetName]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  const rows: CriticalRow[] = []

  for (const source of json) {
    const normalized: Record<string, string> = {}
    for (const [key, rawValue] of Object.entries(source)) {
      normalized[normalizeHeader(key)] = String(rawValue ?? '').trim()
    }

    const dci = pick(normalized, ['dci', 'denomination_commune_internationale'])
    const forme = pick(normalized, ['forme', 'forme_pharmaceutique'])
    const dosage = pick(normalized, ['dosage'])
    const classe = pick(normalized, ['classe_therapeutique', 'classe_therapeutique_'])

    if (!dci || !forme || !dosage) continue

    rows.push({
      dci,
      forme,
      dosage,
      classe_therapeutique: classe || null,
    })
  }

  return rows
}

async function ensureCriticalTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS critical_medicaments (
      id BIGSERIAL PRIMARY KEY,
      dci TEXT NOT NULL,
      forme TEXT NOT NULL,
      dosage TEXT NOT NULL,
      classe_therapeutique TEXT,
      source_label TEXT DEFAULT 'Ministère de la Santé Algérie',
      published_at DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      dci_norm TEXT GENERATED ALWAYS AS (
        UPPER(REGEXP_REPLACE(UNACCENT(COALESCE(dci, '')), '[^A-Z0-9]+', '', 'g'))
      ) STORED,
      forme_norm TEXT GENERATED ALWAYS AS (
        UPPER(REGEXP_REPLACE(UNACCENT(COALESCE(forme, '')), '[^A-Z0-9]+', '', 'g'))
      ) STORED,
      dosage_norm TEXT GENERATED ALWAYS AS (
        UPPER(REGEXP_REPLACE(UNACCENT(COALESCE(dosage, '')), '[^A-Z0-9]+', '', 'g'))
      ) STORED,
      CONSTRAINT critical_medicaments_unique_norm UNIQUE (dci_norm, forme_norm, dosage_norm)
    )
  `)

  await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_medicaments_dci_norm ON critical_medicaments (dci_norm)`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_medicaments_forme_norm ON critical_medicaments (forme_norm)`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_medicaments_dosage_norm ON critical_medicaments (dosage_norm)`)
}

async function upsertCriticalRows(
  client: any,
  rows: CriticalRow[],
  sourceLabel: string,
  publishedAt: string | null
): Promise<number> {
  const chunkSize = 300

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const placeholders = chunk.map((_, idx) => {
      const base = idx * 6
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
    }).join(', ')

    const values = chunk.flatMap((row) => [
      row.dci,
      row.forme,
      row.dosage,
      row.classe_therapeutique,
      sourceLabel,
      publishedAt,
    ])

    await client.query(`
      INSERT INTO critical_medicaments (dci, forme, dosage, classe_therapeutique, source_label, published_at)
      VALUES ${placeholders}
      ON CONFLICT (dci_norm, forme_norm, dosage_norm)
      DO UPDATE SET
        classe_therapeutique = EXCLUDED.classe_therapeutique,
        source_label = EXCLUDED.source_label,
        published_at = COALESCE(EXCLUDED.published_at, critical_medicaments.published_at)
    `, values)
  }

  return rows.length
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const sourceLabel = (formData.get('sourceLabel') as string | null)?.trim() || 'Ministère de la Santé Algérie'
  const publishedAt = (formData.get('publishedAt') as string | null)?.trim() || null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Aucun fichier CSV/XLSX fourni.' }, { status: 400 })
  }

  if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
    return NextResponse.json({ error: 'Formats acceptés: .csv, .xlsx, .xls' }, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Lecture du fichier impossible.' }, { status: 400 })
  }

  let rows: CriticalRow[] = []
  try {
    rows = parseCriticalRows(buffer)
  } catch (error: any) {
    return NextResponse.json({ error: `Erreur de parsing: ${error?.message ?? 'format invalide'}` }, { status: 422 })
  }

  if (!rows.length) {
    return NextResponse.json({
      error: 'Aucune ligne valide. Colonnes attendues: DCI, Forme, Dosage (+ Classe thérapeutique optionnelle).',
    }, { status: 422 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await ensureCriticalTable(client)
    const imported = await upsertCriticalRows(client, rows, sourceLabel, publishedAt)
    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      imported,
      sourceLabel,
      publishedAt,
    })
  } catch (error: any) {
    await client.query('ROLLBACK')
    return NextResponse.json({
      error: `Erreur SQL: ${error?.message ?? 'insertion impossible'}`,
    }, { status: 500 })
  } finally {
    client.release()
  }
}
