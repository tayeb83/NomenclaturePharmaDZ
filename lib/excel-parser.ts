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

function isValidDateParts(y: number, m: number, d: number): boolean {
  if (y < 1000 || y > 9999) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  return true
}

function cleanDate(val: unknown): string | null {
  if (val === null || val === undefined) return null

  // Déjà un objet Date (si cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    // Utiliser les composantes locales pour éviter le décalage UTC
    const y = val.getFullYear()
    const m = val.getMonth() + 1
    const d = val.getDate()
    if (!isValidDateParts(y, m, d)) return null
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // Nombre série Excel (entier ou flottant)
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val)
      if (!parsed) return null
      const { y, m, d } = parsed
      if (!isValidDateParts(y, m, d)) return null
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    } catch {
      return null
    }
  }

  // Chaîne de texte
  const s = String(val).trim()
  if (!s) return null

  // Rejeter les chaînes purement numériques (numéros de série Excel stockés en texte)
  // ex: "42736" → new Date("42736") = an 42736 → "+042736-01-01" → PostgreSQL plante
  if (/^\d+(\.\d+)?$/.test(s)) {
    try {
      const n = parseFloat(s)
      const parsed = XLSX.SSF.parse_date_code(n)
      if (!parsed) return null
      const { y, m, d } = parsed
      if (!isValidDateParts(y, m, d)) return null
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    } catch {
      return null
    }
  }

  // Format JJ/MM/AAAA (format français courant dans les exports MIPH)
  const frDate = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (frDate) {
    const [, dd, mm, yyyy] = frDate
    const y = parseInt(yyyy), m = parseInt(mm), d = parseInt(dd)
    if (!isValidDateParts(y, m, d)) return null
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  // Format AAAA-MM-JJ (ISO)
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) {
    const y = parseInt(isoDate[1]), m = parseInt(isoDate[2]), d = parseInt(isoDate[3])
    if (!isValidDateParts(y, m, d)) return null
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`
  }

  // Formats avec séparateur point : JJ.MM.AAAA
  const dotDate = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotDate) {
    const [, dd, mm, yyyy] = dotDate
    const y = parseInt(yyyy), m = parseInt(mm), d = parseInt(dd)
    if (!isValidDateParts(y, m, d)) return null
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
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

type HeaderMap = {
  n_enreg: number
  code: number
  dci: number
  nom_marque: number
  forme: number
  dosage: number
  conditionnement: number
  liste: number
  prescription: number
  obs: number
  labo: number
  pays: number
  date_init: number
  date_final: number
  type_prod: number
  statut: number
  stabilite: number
  date_retrait: number
  motif_retrait: number
}

const DEFAULT_COLS: HeaderMap = {
  n_enreg: 1,
  code: 2,
  dci: 3,
  nom_marque: 4,
  forme: 5,
  dosage: 6,
  conditionnement: 7,
  liste: 8,
  prescription: 9,
  obs: 10,
  labo: 13,
  pays: 14,
  date_init: 15,
  date_final: 16,
  type_prod: 17,
  statut: 18,
  stabilite: 19,
  date_retrait: 18,
  motif_retrait: 19,
}

function normalizeHeader(val: unknown): string {
  const text = String(val ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
  return text.replace(/[^A-Z0-9]+/g, ' ').trim()
}

function buildHeaderMap(headerRow: RawRow | undefined): HeaderMap {
  if (!headerRow) return DEFAULT_COLS

  const normalized = headerRow.map(normalizeHeader)
  const findIndex = (...needles: string[]) => {
    const idx = normalized.findIndex(col => needles.every(n => col.includes(n)))
    return idx >= 0 ? idx : null
  }

  const map: HeaderMap = { ...DEFAULT_COLS }

  map.n_enreg = findIndex('ENREGISTREMENT') ?? map.n_enreg
  map.code = findIndex('CODE') ?? map.code
  map.dci = findIndex('DENOMINATION', 'COMMUNE', 'INTERNATIONALE') ?? map.dci
  map.nom_marque = findIndex('NOM', 'MARQUE') ?? map.nom_marque
  map.forme = findIndex('FORME') ?? map.forme
  map.dosage = findIndex('DOSAGE') ?? map.dosage
  map.conditionnement = findIndex('CONDITIONNEMENT') ?? map.conditionnement
  map.liste = findIndex('LISTE') ?? map.liste
  map.prescription = findIndex('P1') ?? map.prescription
  map.obs = findIndex('OBS') ?? map.obs
  map.labo = findIndex('LABORATOIRES', 'DETENTEUR', 'DECISION', 'ENREGISTREMENT') ?? map.labo
  map.pays = findIndex('PAYS', 'LABORATOIRE', 'DETENTEUR', 'DECISION', 'ENREGISTREMENT') ?? map.pays
  map.date_init = findIndex('DATE', 'ENREGISTREMENT', 'INITIAL') ?? map.date_init
  map.date_final = findIndex('DATE', 'ENREGISTREMENT', 'FINAL') ?? map.date_final
  map.type_prod = findIndex('TYPE') ?? map.type_prod
  map.statut = findIndex('STATUT') ?? map.statut
  map.stabilite = findIndex('DUREE', 'STABILITE') ?? map.stabilite
  map.date_retrait = findIndex('DATE', 'RETRAIT') ?? map.date_retrait
  map.motif_retrait = findIndex('MOTIF', 'RETRAIT') ?? map.motif_retrait

  return map
}

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
  const cols = buildHeaderMap(rawData[headerIdx])

  const dataRows = rawData.slice(headerIdx + 1)
  const result: ParsedEnregistrement[] = []

  for (const row of dataRows) {
    // Ignorer les lignes vides (cols 1 et 3 doivent être remplies)
    if (!row[cols.n_enreg] && !row[cols.dci]) continue
    if (!cleanStr(row[cols.n_enreg]) && !cleanStr(row[cols.dci])) continue

    result.push({
      n_enreg:        cleanNEnreg(row[cols.n_enreg]),
      code:           cleanStr(row[cols.code]),
      dci:            cleanStr(row[cols.dci]),
      nom_marque:     cleanStr(row[cols.nom_marque]),
      forme:          cleanStr(row[cols.forme]),
      dosage:         cleanStr(row[cols.dosage]),
      conditionnement:cleanStr(row[cols.conditionnement]),
      liste:          cleanStr(row[cols.liste]),
      prescription:   cleanStr(row[cols.prescription]),
      obs:            cleanStr(row[cols.obs] ?? null),
      labo:           cleanStr(row[cols.labo] ?? null),
      pays:           cleanStr(row[cols.pays] ?? null),
      date_init:      cleanDate(row[cols.date_init] ?? null),
      date_final:     cleanDate(row[cols.date_final] ?? null),
      type_prod:      cleanStr(row[cols.type_prod] ?? null),
      statut:         cleanStr(row[cols.statut] ?? null),
      stabilite:      cleanStr(row[cols.stabilite] ?? null),
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
  const cols = buildHeaderMap(rawData[headerIdx])

  const dataRows = rawData.slice(headerIdx + 1)
  const result: ParsedRetrait[] = []

  for (const row of dataRows) {
    if (!row[cols.n_enreg] && !row[cols.dci]) continue
    if (!cleanStr(row[cols.n_enreg]) && !cleanStr(row[cols.dci])) continue

    result.push({
      n_enreg:        cleanNEnreg(row[cols.n_enreg]),
      code:           cleanStr(row[cols.code]),
      dci:            cleanStr(row[cols.dci]),
      nom_marque:     cleanStr(row[cols.nom_marque]),
      forme:          cleanStr(row[cols.forme]),
      dosage:         cleanStr(row[cols.dosage]),
      conditionnement:cleanStr(row[cols.conditionnement]),
      liste:          cleanStr(row[cols.liste]),
      prescription:   cleanStr(row[cols.prescription]),
      labo:           cleanStr(row[cols.labo] ?? null),
      pays:           cleanStr(row[cols.pays] ?? null),
      date_init:      cleanDate(row[cols.date_init] ?? null),
      type_prod:      cleanStr(row[cols.type_prod] ?? null),
      statut:         cleanStr(row[cols.statut] ?? null),
      date_retrait:   cleanDate(row[cols.date_retrait] ?? null),
      motif_retrait:  cleanStr(row[cols.motif_retrait] ?? null),
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
  const cols = buildHeaderMap(rawData[headerIdx])

  const dataRows = rawData.slice(headerIdx + 1)
  const result: ParsedNonRenouvele[] = []

  for (const row of dataRows) {
    if (!row[cols.n_enreg] && !row[cols.dci]) continue
    if (!cleanStr(row[cols.n_enreg]) && !cleanStr(row[cols.dci])) continue

    result.push({
      n_enreg:        cleanNEnreg(row[cols.n_enreg]),
      code:           cleanStr(row[cols.code]),
      dci:            cleanStr(row[cols.dci]),
      nom_marque:     cleanStr(row[cols.nom_marque]),
      forme:          cleanStr(row[cols.forme]),
      dosage:         cleanStr(row[cols.dosage]),
      conditionnement:cleanStr(row[cols.conditionnement]),
      liste:          cleanStr(row[cols.liste]),
      prescription:   cleanStr(row[cols.prescription]),
      labo:           cleanStr(row[cols.labo] ?? null),
      pays:           cleanStr(row[cols.pays] ?? null),
      date_init:      cleanDate(row[cols.date_init] ?? null),
      date_final:     cleanDate(row[cols.date_final] ?? null),
      type_prod:      cleanStr(row[cols.type_prod] ?? null),
      statut:         cleanStr(row[cols.statut] ?? null),
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
