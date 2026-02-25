/**
 * Parseur Excel pour la nomenclature MIPH (Ministère de l'Industrie Pharmaceutique)
 * Port TypeScript du script Python scripts/ingest_to_supabase.py
 */

import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────

export type ParsedEnregistrement = {
  n_enreg: string | null
  code: string | null
  dci: string | null
  nom_marque: string | null
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  liste: string | null
  prescription: string | null
  obs: string | null
  labo: string | null
  pays: string | null
  date_init: string | null
  date_final: string | null
  type_prod: string | null
  statut: string | null
  stabilite: string | null
}

export type ParsedRetrait = {
  n_enreg: string | null
  code: string | null
  dci: string | null
  nom_marque: string | null
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  liste: string | null
  prescription: string | null
  labo: string | null
  pays: string | null
  date_init: string | null
  type_prod: string | null
  statut: string | null
  date_retrait: string | null
  motif_retrait: string | null
}

export type ParsedNonRenouvele = {
  n_enreg: string | null
  code: string | null
  dci: string | null
  nom_marque: string | null
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
}

export type ParsedNomenclature = {
  enregistrements: ParsedEnregistrement[]
  retraits: ParsedRetrait[]
  nonRenouveles: ParsedNonRenouvele[]
  versionLabel: string
}

// ─── Nettoyage ────────────────────────────────────────────────

function cleanStr(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  return s || null
}

function cleanDate(val: unknown): string | null {
  if (val === null || val === undefined) return null

  // Déjà un objet Date (si cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    return val.toISOString().split('T')[0]
  }

  // Nombre série Excel (entier ou flottant)
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val)
      if (!parsed) return null
      const { y, m, d } = parsed
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    } catch {
      return null
    }
  }

  // Chaîne de texte
  const s = String(val).trim()
  if (!s) return null

  // Format JJ/MM/AAAA (format français courant dans les exports MIPH)
  const frDate = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (frDate) {
    const [, d, m, y] = frDate
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Format AAAA-MM-JJ (ISO)
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`

  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch {
    // ignore
  }
  return null
}

function cleanNEnreg(val: unknown): string | null {
  const s = cleanStr(val)
  if (!s) return null
  // Normaliser les espaces parasites (export MIPH)
  return s.split(/\s+/).join(' ')
}

// ─── Détection des feuilles ───────────────────────────────────

function detectSheet(workbook: XLSX.WorkBook, keyword: string): string | null {
  const upper = keyword.toUpperCase()
  for (const name of workbook.SheetNames) {
    if (name.toUpperCase().includes(upper)) return name
  }
  return null
}

// ─── Lecture d'une feuille avec détection d'en-tête ──────────

type RawRow = (string | number | Date | boolean | null | undefined)[]

function readSheetRaw(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  const ws = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<RawRow>(ws, {
    header: 1,
    defval: null,
    raw: true,  // garde les types natifs (Date, number)
  }) as RawRow[]
}

function findHeaderRow(data: RawRow[]): number {
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i]
    if (Array.isArray(row) && row.some(v => v && String(v).toUpperCase().includes('ENREGISTREMENT'))) {
      return i
    }
  }
  return -1
}

// ─── Clé d'identité (même logique que le script Python) ───────

export function identityKey(row: { n_enreg: string | null; code: string | null; dci: string | null; nom_marque: string | null; dosage: string | null }): string {
  if (row.n_enreg) return `N::${row.n_enreg}`
  return `F::${row.code}::${row.dci}::${row.nom_marque}::${row.dosage}`
}

// ─── Inférence du label de version depuis le nom de fichier ───

export function inferVersionFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
  const months = 'janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre'
  const m = base.match(new RegExp(`(${months})\\s*(20\\d{2})`, 'i'))
  if (m) {
    const monthStr = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()
    return `${monthStr} ${m[2]}`
  }
  const year = base.match(/20\d{2}/)
  return year ? year[0] : base
}

// ─── Parsing de la date de référence depuis le label ──────────

export function parseReferenceDate(label: string): string | null {
  const months: Record<string, number> = {
    'janvier': 1, 'fevrier': 2, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5,
    'juin': 6, 'juillet': 7, 'aout': 8, 'août': 8, 'septembre': 9, 'octobre': 10,
    'novembre': 11, 'decembre': 12, 'décembre': 12,
  }
  const text = label.toLowerCase()
  const yearMatch = text.match(/(20\d{2})/)
  if (!yearMatch) return null
  const year = yearMatch[1]
  for (const [name, month] of Object.entries(months)) {
    if (text.includes(name)) {
      return `${year}-${String(month).padStart(2, '0')}-01`
    }
  }
  return `${year}-12-01`
}

// ─── Parseurs par feuille ─────────────────────────────────────

export function parseEnregistrements(workbook: XLSX.WorkBook): ParsedEnregistrement[] {
  const sheetName = detectSheet(workbook, 'Nomenclature')
  if (!sheetName) throw new Error('Feuille "Nomenclature" introuvable dans le fichier Excel')

  const rawData = readSheetRaw(workbook, sheetName)
  const headerIdx = findHeaderRow(rawData)
  if (headerIdx === -1) throw new Error('En-tête (colonne "N° Enregistrement") introuvable dans la feuille Nomenclature')

  const dataRows = rawData.slice(headerIdx + 1)
  const result: ParsedEnregistrement[] = []

  for (const row of dataRows) {
    // Ignorer les lignes vides (cols 1 et 3 doivent être remplies)
    if (!row[1] && !row[3]) continue
    if (!cleanStr(row[1]) && !cleanStr(row[3])) continue

    result.push({
      n_enreg:        cleanNEnreg(row[1]),
      code:           cleanStr(row[2]),
      dci:            cleanStr(row[3]),
      nom_marque:     cleanStr(row[4]),
      forme:          cleanStr(row[5]),
      dosage:         cleanStr(row[6]),
      conditionnement:cleanStr(row[7]),
      liste:          cleanStr(row[8]),
      prescription:   cleanStr(row[9]),
      // col[10] ignoré (souvent vide ou col de séparation)
      obs:            cleanStr(row[11] ?? null),
      labo:           cleanStr(row[12] ?? null),
      pays:           cleanStr(row[13] ?? null),
      date_init:      cleanDate(row[14] ?? null),
      date_final:     cleanDate(row[15] ?? null),
      type_prod:      cleanStr(row[16] ?? null),
      statut:         cleanStr(row[17] ?? null),
      stabilite:      cleanStr(row[18] ?? null),
    })
  }

  return result
}

export function parseRetraits(workbook: XLSX.WorkBook): ParsedRetrait[] {
  const sheetName = detectSheet(workbook, 'Retrait')
  if (!sheetName) return []  // La feuille peut être absente

  const rawData = readSheetRaw(workbook, sheetName)
  const headerIdx = findHeaderRow(rawData)
  if (headerIdx === -1) return []

  const dataRows = rawData.slice(headerIdx + 1)
  const result: ParsedRetrait[] = []

  for (const row of dataRows) {
    if (!row[1] && !row[3]) continue
    if (!cleanStr(row[1]) && !cleanStr(row[3])) continue

    result.push({
      n_enreg:        cleanNEnreg(row[1]),
      code:           cleanStr(row[2]),
      dci:            cleanStr(row[3]),
      nom_marque:     cleanStr(row[4]),
      forme:          cleanStr(row[5]),
      dosage:         cleanStr(row[6]),
      conditionnement:cleanStr(row[7]),
      liste:          cleanStr(row[8]),
      prescription:   cleanStr(row[9]),
      // col[10] ignoré
      labo:           cleanStr(row[11] ?? null),
      pays:           cleanStr(row[12] ?? null),
      date_init:      cleanDate(row[13] ?? null),
      type_prod:      cleanStr(row[14] ?? null),
      statut:         cleanStr(row[15] ?? null),
      date_retrait:   cleanDate(row[16] ?? null),
      motif_retrait:  cleanStr(row[17] ?? null),
    })
  }

  return result
}

export function parseNonRenouveles(workbook: XLSX.WorkBook): ParsedNonRenouvele[] {
  const sheetName = detectSheet(workbook, 'Non Renouvel')
  if (!sheetName) return []

  const rawData = readSheetRaw(workbook, sheetName)
  const headerIdx = findHeaderRow(rawData)
  if (headerIdx === -1) return []

  const dataRows = rawData.slice(headerIdx + 1)
  const result: ParsedNonRenouvele[] = []

  for (const row of dataRows) {
    if (!row[1] && !row[3]) continue
    if (!cleanStr(row[1]) && !cleanStr(row[3])) continue

    result.push({
      n_enreg:        cleanNEnreg(row[1]),
      code:           cleanStr(row[2]),
      dci:            cleanStr(row[3]),
      nom_marque:     cleanStr(row[4]),
      forme:          cleanStr(row[5]),
      dosage:         cleanStr(row[6]),
      conditionnement:cleanStr(row[7]),
      liste:          cleanStr(row[8]),
      prescription:   cleanStr(row[9]),
      // col[10] ignoré
      labo:           cleanStr(row[11] ?? null),
      pays:           cleanStr(row[12] ?? null),
      date_init:      cleanDate(row[13] ?? null),
      date_final:     cleanDate(row[14] ?? null),
      type_prod:      cleanStr(row[15] ?? null),
      statut:         cleanStr(row[16] ?? null),
    })
  }

  return result
}

// ─── Point d'entrée principal ─────────────────────────────────

export function parseNomenclatureFile(buffer: Buffer, filename: string, labelOverride?: string): ParsedNomenclature {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  const versionLabel = labelOverride?.trim() || inferVersionFromFilename(filename)

  const enregistrements = parseEnregistrements(workbook)
  const retraits = parseRetraits(workbook)
  const nonRenouveles = parseNonRenouveles(workbook)

  return { enregistrements, retraits, nonRenouveles, versionLabel }
}
