import { NextResponse } from 'next/server'
import { getMarketComparatorData } from '@/lib/queries'
import { recordApiExec } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getMarketComparatorData()
    await recordApiExec({ api_path: '/api/comparateur', method: 'GET', status_code: 200 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/comparateur]', err)
    await recordApiExec({ api_path: '/api/comparateur', method: 'GET', status_code: 500 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
