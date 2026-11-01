import { cookies } from 'next/headers'
import Link from 'next/link'
import { getAdminSessionInfo } from '@/lib/admin-auth'
import { getDashboardData } from '@/lib/admin-dashboard'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

const nf = new Intl.NumberFormat('fr-FR')
const fmt = (n: number | null) => (n === null ? '—' : nf.format(n))

function VisitsChart({ data }: { data: { day: string; n: number }[] }) {
  const W = 560, H = 190, l = 44, r = 10, t = 10, b = 24
  const top = Math.max(10, ...data.map(d => d.n))
  const max = Math.ceil(top / 4 / (10 ** Math.max(0, String(top).length - 2))) * 4 * 10 ** Math.max(0, String(top).length - 2) || 4
  const x = (i: number) => l + (i * (W - l - r)) / Math.max(1, data.length - 1)
  const y = (v: number) => t + (1 - v / max) * (H - t - b)
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.n).toFixed(1)}`).join(' ')
  const last = data[data.length - 1]
  const label = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return (
    <svg className="adm-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Visites par jour sur 30 jours">
      {[0, 1, 2, 3, 4].map(k => (
        <g key={k}>
          <line x1={l} x2={W - r} y1={y((max * k) / 4)} y2={y((max * k) / 4)} stroke="var(--adm-line)" />
          <text x={l - 8} y={y((max * k) / 4) + 4} textAnchor="end">{nf.format((max * k) / 4)}</text>
        </g>
      ))}
      <text x={x(0)} y={H - 6} textAnchor="start">{label(data[0].day)}</text>
      <text x={x(data.length - 1)} y={H - 6} textAnchor="end">{label(last.day)}</text>
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(data.length - 1)},${y(0)}`} fill="var(--adm-accent)" opacity=".12" />
      <polyline points={pts} fill="none" stroke="var(--adm-accent)" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(last.n)} r="4.5" fill="var(--adm-accent)" stroke="var(--adm-surface)" strokeWidth="2" />
    </svg>
  )
}

export default async function AdminPage() {
  const cookieStore = await cookies()
  const session = getAdminSessionInfo(cookieStore.get('admin_session')?.value)
  if (!session) return <LoginForm />

  const d = await getDashboardData()
  const total30 = d.visitsByDay ? d.visitsByDay.reduce((s, v) => s + v.n, 0) : null
  const delta = total30 !== null && d.visitsPrev ? Math.round(((total30 - d.visitsPrev) / d.visitsPrev) * 100) : null
  const first = (session.name || '').split(' ')[0]
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isEditor = session.role === 'editor'

  const todo = [
    { label: 'Demandes d’accès Training', n: d.todo.trainingPending, href: '/admin/training', sub: 'en attente', tone: 'wa' },
    { label: 'Signalements de garde', n: d.todo.gardeReports, href: '/admin/garde/signalements', sub: 'à vérifier', tone: 'bad' },
    { label: 'Publications Facebook', n: d.todo.socialDrafts, href: '/admin/social', sub: 'brouillons', tone: 'in' },
    { label: 'Questions QCM à relire', n: d.todo.questionsDraft, href: '/admin/training/questions', sub: 'brouillons', tone: 'wa' },
  ]

  return (
    <div className="adm-page">
      <div className="adm-head">
        <div>
          <h1>Bonjour{first ? ` ${first}` : ''}</h1>
          <p>
            {today.charAt(0).toUpperCase() + today.slice(1)}
            {d.version ? ` · Nomenclature en ligne : ${d.version.label}` : ''}
          </p>
        </div>
        {!isEditor && <Link href="/admin/import" className="adm-btn p">Importer une nomenclature</Link>}
      </div>

      <div className="adm-kpis">
        <div className="adm-card adm-kpi">
          <small>Visites (30 jours)</small><b>{fmt(total30)}</b>
          <span className={delta === null ? 'adm-mu' : delta >= 0 ? 'adm-up' : 'adm-dn'}>
            {delta === null ? 'Pas de période de comparaison' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} % vs 30 jours précédents`}
          </span>
        </div>
        <div className="adm-card adm-kpi">
          <small>Médicaments en base</small><b>{fmt(d.medicaments)}</b>
          <span className="adm-up">{d.version ? `+${nf.format(d.version.nouveautes)} dans la dernière version` : ''}</span>
        </div>
        <div className="adm-card adm-kpi">
          <small>Pharmacies de garde</small><b>{fmt(d.gardeTotal)}</b>
          <span className="adm-wa">{d.gardeNoGps ? `${nf.format(d.gardeNoGps)} sans coordonnées GPS` : ''}</span>
        </div>
        <div className="adm-card adm-kpi">
          <small>Accès Training validés</small><b>{fmt(d.trainingApproved)}</b>
          <span className="adm-up">{d.trainingNew7d ? `+${nf.format(d.trainingNew7d)} demandes cette semaine` : ''}</span>
        </div>
      </div>

      <div className="adm-cols">
        <div className="adm-card">
          <h3>Visites par jour <Link href="/admin/import?tab=analytics">Voir les analytics →</Link></h3>
          {d.visitsByDay ? <VisitsChart data={d.visitsByDay} /> : <p className="adm-mu">Les statistiques de visites ne sont pas disponibles (sql/16_analytics_events.sql).</p>}
        </div>
        <div className="adm-card">
          <h3>À traiter</h3>
          <div className="adm-todo">
            {todo.map(t => (
              <Link key={t.label} href={t.href} className="adm-row">
                <div>{t.label}<small>{t.n === null ? 'indisponible' : t.n === 0 ? 'rien en attente' : `${nf.format(t.n)} ${t.sub}`}</small></div>
                {t.n ? <span className={`adm-pill ${t.tone}`}>{nf.format(t.n)}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="adm-card">
        <h3>Raccourcis</h3>
        <div className="adm-shortcuts">
          <Link href="/admin/ppa" className="adm-sc">PPA<small>Prix public algérien</small></Link>
          <Link href="/admin/specialites" className="adm-sc">Spécialités<small>Classement des médicaments</small></Link>
          <Link href="/admin/monographies" className="adm-sc">Monographies DCI<small>Rédaction et relecture</small></Link>
          <Link href="/admin/garde/publication" className="adm-sc">Publier les gardes<small>Planning de la semaine</small></Link>
        </div>
      </div>
    </div>
  )
}
