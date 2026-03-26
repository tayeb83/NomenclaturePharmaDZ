import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getCriticalWithMeds } from '@/lib/queries'

export const runtime = 'nodejs'

function escapeCsv(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  const format = (req.nextUrl.searchParams.get('format') || 'csv').toLowerCase()

  if (format !== 'csv' && format !== 'xlsx') {
    return NextResponse.json({ error: 'Format invalide. Utiliser csv ou xlsx.' }, { status: 400 })
  }

  const rows = await getCriticalWithMeds(q)

  const grouped = new Map<number, {
    dci: string
    forme: string
    dosage: string
    classe: string
    meds: string[]
  }>()

  for (const row of rows) {
    const current = grouped.get(row.critical_id) ?? {
      dci: row.dci,
      forme: row.forme,
      dosage: row.dosage,
      classe: row.classe_therapeutique || '',
      meds: [],
    }

    if (row.med_id !== null && row.nom_marque) {
      const meta = [row.nom_marque, row.n_enreg || '', row.med_forme || ''].filter(Boolean).join(' | ')
      if (!current.meds.includes(meta)) current.meds.push(meta)
    }

    grouped.set(row.critical_id, current)
  }

  const exportRows = Array.from(grouped.values()).map(item => ({
    DCI: item.dci,
    Forme: item.forme,
    Dosage: item.dosage,
    'Classe thérapeutique': item.classe,
    'Nombre correspondances': item.meds.length,
    Correspondances: item.meds.join(' ; '),
  }))

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Critiques')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="medicaments-critiques-${Date.now()}.xlsx"`,
      },
    })
  }

  const header = ['DCI', 'Forme', 'Dosage', 'Classe thérapeutique', 'Nombre correspondances', 'Correspondances']
  const lines = [header.join(';')]
  for (const row of exportRows) {
    lines.push([
      row.DCI,
      row.Forme,
      row.Dosage,
      row['Classe thérapeutique'],
      String(row['Nombre correspondances']),
      row.Correspondances,
    ].map((v) => escapeCsv(v || '')).join(';'))
  }

  const csv = `\uFEFF${lines.join('\n')}`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="medicaments-critiques-${Date.now()}.csv"`,
    },
  })
}
