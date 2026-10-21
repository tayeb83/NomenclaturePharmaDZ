import { NextRequest, NextResponse } from 'next/server'
import { getTraining } from '@/lib/training'
import { clearSessionCookie, SESSION_COOKIE } from '@/lib/training/auth'
import { rejectForeignOrigin } from '@/lib/training/guard'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const foreign = rejectForeignOrigin(req)
  if (foreign) return foreign
  await getTraining().destroySession(req.cookies.get(SESSION_COOKIE())?.value).catch(() => {})
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
