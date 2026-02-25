import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { pool } from '@/lib/db'
import {
  parseNomenclatureFile,
  parseReferenceDate,
  identityKey,
  type ParsedEnregistrement,
  type ParsedRetrait,
  type ParsedNonRenouvele,
} from '@/lib/excel-parser'

// Augmenter la limite de taille du body pour les fichiers Excel volumineux
export const maxDuration = 60 // secondes (Vercel Pro/hobby = 10s max en Edge)
export const runtime = 'nodejs'

// ─── Helpers SQL ──────────────────────────────────────────────

function toSqlNull(val: string | null): string | null {
  return val === '' ? null : val
}

async function ensureArchiveColumns(client: any) {
  // Ajouter les colonnes d'archive si elles n'existent pas encore
  await client.query(`
    ALTER TABLE nomenclature_versions
      ADD COLUMN IF NOT EXISTS total_retraits       INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_non_renouveles INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS removed_count        INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS uploaded_file        TEXT
  `)
}

async function getCurrentEnregistrementKeys(client: any): Promise<Set<string>> {
  const { rows } = await client.query(`
    SELECT n_enreg, code, dci, nom_marque, dosage FROM enregistrements
  `)
  const keys = new Set<string>()
  for (const row of rows) {
    keys.add(identityKey(row))
  }
  return keys
}

function buildIdentityKeySet(enregistrements: ParsedEnregistrement[]): Set<string> {
  const keys = new Set<string>()
  for (const r of enregistrements) {
    keys.add(identityKey(r))
  }
  return keys
}

// Insert par lots pour éviter les timeouts sur de gros fichiers
async function batchInsert(client: any, sql: string, rows: any[][], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const placeholders = batch.map((_, bIdx) => {
      const base = bIdx * (batch[0]?.length ?? 1)
      const cols = (batch[0] ?? []).map((_: any, cIdx: number) => `$${base + cIdx + 1}`)
      return `(${cols.join(', ')})`
    })
    const flat = batch.flat()
    await client.query(`${sql} ${placeholders.join(', ')}`, flat)
  }
}

// ─── Route principale ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Impossible de lire le formulaire multipart' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const labelInput = (formData.get('label') as string | null)?.trim() || null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    return NextResponse.json({ error: 'Le fichier doit être au format .xlsx ou .xls' }, { status: 400 })
  }

  // Lire le fichier en mémoire
  let buffer: Buffer
  try {
    const arrayBuffer = await file.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
  } catch {
    return NextResponse.json({ error: 'Impossible de lire le fichier uploadé' }, { status: 400 })
  }

  // Parser le fichier Excel
  let parsed: Awaited<ReturnType<typeof parseNomenclatureFile>>
  try {
    parsed = parseNomenclatureFile(buffer, file.name, labelInput ?? undefined)
  } catch (err: any) {
    return NextResponse.json({
      error: `Erreur de lecture Excel : ${err?.message ?? 'format inattendu'}`,
    }, { status: 422 })
  }

  const { enregistrements, retraits, nonRenouveles, versionLabel } = parsed
  const refDate = parseReferenceDate(versionLabel)

  if (enregistrements.length === 0) {
    return NextResponse.json({
      error: 'La feuille "Nomenclature" ne contient aucune donnée valide',
    }, { status: 422 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // S'assurer que les colonnes d'archive existent
    await ensureArchiveColumns(client)

    // Calculer les statistiques AVANT d'écraser les données
    const existingKeys = await getCurrentEnregistrementKeys(client)
    const newKeys = buildIdentityKeySet(enregistrements)

    const addedCount = [...newKeys].filter(k => !existingKeys.has(k)).length
    const removedCount = [...existingKeys].filter(k => !newKeys.has(k)).length

    // Préparer l'année depuis le label de version
    const yearMatch = versionLabel.match(/20\d{2}/)
    const currentYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear()

    // ── Enregistrements : tronquer et réinsérer ──────────────
    await client.query('TRUNCATE TABLE enregistrements RESTART IDENTITY CASCADE')

    const enregRows = enregistrements.map((r: ParsedEnregistrement) => [
      toSqlNull(r.n_enreg),
      toSqlNull(r.code),
      toSqlNull(r.dci),
      toSqlNull(r.nom_marque),
      toSqlNull(r.forme),
      toSqlNull(r.dosage),
      toSqlNull(r.conditionnement),
      toSqlNull(r.liste),
      toSqlNull(r.prescription),
      toSqlNull(r.obs),
      toSqlNull(r.labo),
      toSqlNull(r.pays),
      toSqlNull(r.date_init),
      toSqlNull(r.date_final),
      toSqlNull(r.type_prod),
      toSqlNull(r.statut),
      toSqlNull(r.stabilite),
      currentYear,
      versionLabel,
      !existingKeys.has(identityKey(r)),  // is_new_vs_previous
    ])

    // Insert par lots de 200 lignes (20 colonnes × 200 = 4000 params, < limite pg 65535)
    for (let i = 0; i < enregRows.length; i += 200) {
      const batch = enregRows.slice(i, i + 200)
      const placeholders = batch.map((_, bi) => {
        const base = bi * 20
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17},$${base+18},$${base+19},$${base+20})`
      }).join(',')
      await client.query(
        `INSERT INTO enregistrements
         (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
          prescription, obs, labo, pays, date_init, date_final, type_prod, statut,
          stabilite, annee, source_version, is_new_vs_previous)
         VALUES ${placeholders}`,
        batch.flat()
      )
    }

    // ── Retraits : tronquer et réinsérer ─────────────────────
    await client.query('TRUNCATE TABLE retraits RESTART IDENTITY CASCADE')

    for (let i = 0; i < retraits.length; i += 200) {
      const batch: ParsedRetrait[] = retraits.slice(i, i + 200)
      const placeholders = batch.map((_, bi) => {
        const base = bi * 16
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16})`
      }).join(',')
      const flat = batch.flatMap((r: ParsedRetrait) => [
        toSqlNull(r.n_enreg), toSqlNull(r.code), toSqlNull(r.dci), toSqlNull(r.nom_marque),
        toSqlNull(r.forme), toSqlNull(r.dosage), toSqlNull(r.conditionnement),
        toSqlNull(r.liste), toSqlNull(r.prescription),
        toSqlNull(r.labo), toSqlNull(r.pays), toSqlNull(r.date_init),
        toSqlNull(r.type_prod), toSqlNull(r.statut),
        toSqlNull(r.date_retrait), toSqlNull(r.motif_retrait),
      ])
      await client.query(
        `INSERT INTO retraits
         (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
          prescription, labo, pays, date_init, type_prod, statut, date_retrait, motif_retrait)
         VALUES ${placeholders}`,
        flat
      )
    }

    // ── Non renouvelés : tronquer et réinsérer ───────────────
    await client.query('TRUNCATE TABLE non_renouveles RESTART IDENTITY CASCADE')

    for (let i = 0; i < nonRenouveles.length; i += 200) {
      const batch: ParsedNonRenouvele[] = nonRenouveles.slice(i, i + 200)
      const placeholders = batch.map((_, bi) => {
        const base = bi * 15
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15})`
      }).join(',')
      const flat = batch.flatMap((r: ParsedNonRenouvele) => [
        toSqlNull(r.n_enreg), toSqlNull(r.code), toSqlNull(r.dci), toSqlNull(r.nom_marque),
        toSqlNull(r.forme), toSqlNull(r.dosage), toSqlNull(r.conditionnement),
        toSqlNull(r.liste), toSqlNull(r.prescription),
        toSqlNull(r.labo), toSqlNull(r.pays),
        toSqlNull(r.date_init), toSqlNull(r.date_final),
        toSqlNull(r.type_prod), toSqlNull(r.statut),
      ])
      await client.query(
        `INSERT INTO non_renouveles
         (n_enreg, code, dci, nom_marque, forme, dosage, conditionnement, liste,
          prescription, labo, pays, date_init, date_final, type_prod, statut)
         VALUES ${placeholders}`,
        flat
      )
    }

    // ── Historique des versions (INSERT, pas TRUNCATE) ────────
    // On garde l'historique complet. Si la version existe déjà, on la met à jour.
    await client.query(`
      INSERT INTO nomenclature_versions
        (version_label, reference_date, previous_label,
         total_enregistrements, total_nouveautes,
         total_retraits, total_non_renouveles, removed_count, uploaded_file)
      VALUES ($1, $2,
        (SELECT version_label FROM nomenclature_versions
         WHERE version_label != $1
         ORDER BY reference_date DESC NULLS LAST, created_at DESC LIMIT 1),
        $3, $4, $5, $6, $7, $8)
      ON CONFLICT (version_label) DO UPDATE SET
        reference_date         = EXCLUDED.reference_date,
        total_enregistrements  = EXCLUDED.total_enregistrements,
        total_nouveautes       = EXCLUDED.total_nouveautes,
        total_retraits         = EXCLUDED.total_retraits,
        total_non_renouveles   = EXCLUDED.total_non_renouveles,
        removed_count          = EXCLUDED.removed_count,
        uploaded_file          = EXCLUDED.uploaded_file,
        created_at             = NOW()
    `, [
      versionLabel,
      refDate,
      enregistrements.length,
      addedCount,
      retraits.length,
      nonRenouveles.length,
      removedCount,
      file.name,
    ])

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      versionLabel,
      stats: {
        total_enregistrements: enregistrements.length,
        added_count:           addedCount,
        removed_count:         removedCount,
        total_retraits:        retraits.length,
        total_non_renouveles:  nonRenouveles.length,
      },
    })

  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Admin upload error:', err)
    return NextResponse.json({
      error: `Erreur lors de l'ingestion : ${err?.message ?? 'erreur inconnue'}`,
    }, { status: 500 })
  } finally {
    client.release()
  }
}
