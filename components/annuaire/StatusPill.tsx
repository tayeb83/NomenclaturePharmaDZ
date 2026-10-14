import type { OpenStatus } from '@/lib/annuaire-hours'
import type { Labels } from './labels'
import { statusDetail } from './labels'

const STATE_LABEL: Record<OpenStatus['state'], keyof Labels> = {
  garde: 'garde', open: 'open', closing: 'closing', closed: 'closed',
}

export function StatusPill({ status, t, withDetail = true }: { status: OpenStatus; t: Labels; withDetail?: boolean }) {
  const detail = withDetail ? statusDetail(status, t) : ''
  return (
    <>
      <span className={`an-pill ${status.state}`}>{t[STATE_LABEL[status.state]] as string}</span>
      {detail && <span className="an-pill plain">{detail}</span>}
    </>
  )
}
