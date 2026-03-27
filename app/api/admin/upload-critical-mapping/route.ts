import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60

type MappingRow = {
  n_critique: number | null
  classe_therapeutique: string | null
  dci_critique: string
  forme_critique: string | null
  dosage_critique: string | null
  statut_match: 'OUI' | 'A_REVOIR' | null
  score_global: number | null
  score_dci: number | null
  score_forme: number | null
  score_dosage: number | null
  source_base: 'ACTIVE' | 'RETRAIT' | 'NON_RENOUVELE' | null
  n_base: number | null
  code_base: string | null
  n_enregistrement: string | null
  dci_base: string | null
  marque: string | null
  forme_base: string | null
  dosage_base: string | null
  conditionnement: string | null
}

type ParseResult = {
  rows: MappingRow[]
  totalRows: number
  skippedRows: number
}

const EXPECTED_COLS = 19

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s ? s : null
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (!raw) return null
  const normalized = raw.replace(/\s+/g, '').replace(',', '.')
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

function parseInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (!raw) return null
  const normalized = raw.replace(/\s+/g, '').replace(',', '.')
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

function parseStatut(value: unknown): 'OUI' | 'A_REVOIR' | null {
  const txt = cleanText(value)
  if (!txt) return null
  const normalized = txt.toUpperCase().replace(/\s+/g, '_')
  if (normalized === 'OUI') return 'OUI'
  if (normalized === 'A_REVOIR') return 'A_REVOIR'
  return null
}

function parseSource(value: unknown): 'ACTIVE' | 'RETRAIT' | 'NON_RENOUVELE' | null {
  const txt = cleanText(value)
  if (!txt) return null
  const normalized = txt.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')
  if (normalized === 'ACTIVE') return 'ACTIVE'
  if (normalized === 'RETRAIT') return 'RETRAIT'
  if (normalized === 'NON_RENOUVELE') return 'NON_RENOUVELE'
  return null
}

function isHeaderRow(cells: unknown[]): boolean {
  const c0 = String(cells[0] ?? '').toLowerCase()
  const c1 = String(cells[1] ?? '').toLowerCase()
  const c2 = String(cells[2] ?? '').toLowerCase()
  return c0.includes('critique') || c1.includes('classe') || c2.includes('dci')
}

function parseRows(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return { rows: [], totalRows: 0, skippedRows: 0 }

  const sheet = workbook.Sheets[firstSheetName]
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })

  const rows: MappingRow[] = []
  let skippedRows = 0

  for (const sourceRow of rawRows) {
    const cells = Array.isArray(sourceRow) ? sourceRow : []
    if (cells.length === 0) continue
    if (isHeaderRow(cells)) continue

    if (cells.length < EXPECTED_COLS) {
      skippedRows += 1
      continue
    }

    const dciCritique = cleanText(cells[2])
    if (!dciCritique) {
      skippedRows += 1
      continue
    }

    rows.push({
      n_critique: parseInteger(cells[0]),
      classe_therapeutique: cleanText(cells[1]),
      dci_critique: dciCritique,
      forme_critique: cleanText(cells[3]),
      dosage_critique: cleanText(cells[4]),
      statut_match: parseStatut(cells[5]),
      score_global: parseNumber(cells[6]),
      score_dci: parseNumber(cells[7]),
      score_forme: parseNumber(cells[8]),
      score_dosage: parseNumber(cells[9]),
      source_base: parseSource(cells[10]),
      n_base: parseInteger(cells[11]),
      code_base: cleanText(cells[12]),
      n_enregistrement: cleanText(cells[13]),
      dci_base: cleanText(cells[14]),
      marque: cleanText(cells[15]),
      forme_base: cleanText(cells[16]),
      dosage_base: cleanText(cells[17]),
      conditionnement: cleanText(cells[18]),
    })
  }

  return {
    rows,
    totalRows: rawRows.length,
    skippedRows,
  }
}

async function ensureMappingTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS critical_mapping (
      id BIGSERIAL PRIMARY KEY,
      n_critique INTEGER,
      classe_therapeutique TEXT,
      dci_critique TEXT NOT NULL,
      forme_critique TEXT,
      dosage_critique TEXT,
      statut_match TEXT CHECK (statut_match IN ('OUI', 'A_REVOIR')),
      score_global SMALLINT,
      score_dci SMALLINT,
      score_forme SMALLINT,
      score_dosage SMALLINT,
      source_base TEXT CHECK (source_base IN ('ACTIVE', 'RETRAIT', 'NON_RENOUVELE')),
      n_base INTEGER,
      code_base TEXT,
      n_enregistrement TEXT,
      dci_base TEXT,
      marque TEXT,
      forme_base TEXT,
      dosage_base TEXT,
      conditionnement TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_mapping_dci ON critical_mapping (UPPER(dci_critique))`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_mapping_classe ON critical_mapping (classe_therapeutique)`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_mapping_statut ON critical_mapping (statut_match)`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_mapping_source ON critical_mapping (source_base)`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_critical_mapping_n ON critical_mapping (n_critique)`)
}

async function insertRows(client: any, rows: MappingRow[]) {
  const chunkSize = 300

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const placeholders = chunk
      .map((_, idx) => {
        const base = idx * 19
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19})`
      })
      .join(', ')

    const values = chunk.flatMap((r) => [
      r.n_critique,
      r.classe_therapeutique,
      r.dci_critique,
      r.forme_critique,
      r.dosage_critique,
      r.statut_match,
      r.score_global,
      r.score_dci,
      r.score_forme,
      r.score_dosage,
      r.source_base,
      r.n_base,
      r.code_base,
      r.n_enregistrement,
      r.dci_base,
      r.marque,
      r.forme_base,
      r.dosage_base,
      r.conditionnement,
    ])

    await client.query(
      `
      INSERT INTO critical_mapping (
        n_critique, classe_therapeutique, dci_critique,
        forme_critique, dosage_critique,
        statut_match, score_global, score_dci, score_forme, score_dosage,
        source_base, n_base, code_base, n_enregistrement,
        dci_base, marque, forme_base, dosage_base, conditionnement
      ) VALUES ${placeholders}
      `,
      values
    )
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })
  }

  if (!file.name.match(/\.(csv|tsv|xlsx|xls)$/i)) {
    return NextResponse.json({ error: 'Formats acceptés: .tsv, .csv, .xlsx, .xls' }, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'Lecture du fichier impossible.' }, { status: 400 })
  }

  let parseResult: ParseResult
  try {
    parseResult = parseRows(buffer)
  } catch (error: any) {
    return NextResponse.json({ error: `Erreur de parsing: ${error?.message ?? 'format invalide'}` }, { status: 422 })
  }

  if (parseResult.rows.length === 0) {
    return NextResponse.json({
      error: 'Aucune ligne valide détectée. Vérifiez la structure du fichier de correspondances.',
      totalRows: parseResult.totalRows,
      skippedRows: parseResult.skippedRows,
    }, { status: 422 })
  }

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await ensureMappingTable(client)
    await client.query('TRUNCATE TABLE critical_mapping RESTART IDENTITY')
    await insertRows(client, parseResult.rows)
    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      imported: parseResult.rows.length,
      totalRows: parseResult.totalRows,
      skippedRows: parseResult.skippedRows,
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
