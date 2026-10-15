/**
 * Statut d'ouverture d'une pharmacie — logique pure (aucune dépendance
 * serveur), partagée entre le rendu serveur et les composants client qui
 * recalculent le statut à l'heure du visiteur.
 *
 * Règle : de garde (planning DSP) > jour de repos > horaires de la fiche >
 * 10h–21h par défaut. L'Algérie est à UTC+1 toute l'année (pas d'heure
 * d'été) : on évite ainsi toute dépendance à Intl pour ce calcul.
 */

export const DEFAULT_OPENS = '10:00'
export const DEFAULT_CLOSES = '21:00'
/** Délai avant fermeture à partir duquel on affiche « ferme bientôt ». */
export const CLOSING_SOON_MINUTES = 45

export type PharmacyHours = {
  /** 'HH:MM', null = défaut du site */
  opens: string | null
  closes: string | null
  /** 0 = dimanche … 6 = samedi */
  closedDays: number[]
}

/** Période de garde [début, fin[ en millisecondes epoch. */
export type GardeWindow = [number, number]

export type OpenState = 'garde' | 'open' | 'closing' | 'closed'

export type OpenStatus = {
  state: OpenState
  /** Garde / ouvert : heure de fin ('HH:MM'). */
  until?: string
  /** Fermé : prochaine ouverture ('HH:MM') et décalage en jours (0 = aujourd'hui). */
  opensAt?: string
  opensInDays?: number
}

const ALGIERS_OFFSET_MS = 60 * 60 * 1000

export function algiersParts(ms: number): { weekday: number; minutes: number } {
  const d = new Date(ms + ALGIERS_OFFSET_MS)
  return { weekday: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() }
}

export function formatAlgiersTime(ms: number): string {
  const { minutes } = algiersParts(ms)
  return minutesToHHMM(minutes)
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function hhmmToMinutes(value: string | null | undefined, fallback: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(value || fallback) || /^(\d{1,2}):(\d{2})/.exec(fallback)!
  return Number(m[1]) * 60 + Number(m[2])
}

export function effectiveHours(hours: PharmacyHours): { opens: string; closes: string } {
  return {
    opens: minutesToHHMM(hhmmToMinutes(hours.opens, DEFAULT_OPENS)),
    closes: minutesToHHMM(hhmmToMinutes(hours.closes, DEFAULT_CLOSES)),
  }
}

export function computeStatus(hours: PharmacyHours, garde: GardeWindow[], nowMs: number): OpenStatus {
  const active = garde.find(([start, end]) => start <= nowMs && nowMs < end)
  if (active) return { state: 'garde', until: formatAlgiersTime(active[1]) }

  const open = hhmmToMinutes(hours.opens, DEFAULT_OPENS)
  const close = hhmmToMinutes(hours.closes, DEFAULT_CLOSES)
  const { weekday, minutes } = algiersParts(nowMs)

  if (!hours.closedDays.includes(weekday) && minutes >= open && minutes < close) {
    return {
      state: close - minutes <= CLOSING_SOON_MINUTES ? 'closing' : 'open',
      until: minutesToHHMM(close),
    }
  }

  // Fermée : prochaine ouverture (aujourd'hui si l'heure n'est pas passée).
  const todayOk = !hours.closedDays.includes(weekday) && minutes < open
  if (todayOk) return { state: 'closed', opensAt: minutesToHHMM(open), opensInDays: 0 }
  for (let i = 1; i <= 7; i++) {
    if (!hours.closedDays.includes((weekday + i) % 7)) {
      return { state: 'closed', opensAt: minutesToHHMM(open), opensInDays: i }
    }
  }
  return { state: 'closed' }
}

/**
 * Garde qui commence plus tard dans la journée (heure d'Alger) : la pharmacie
 * figure au planning du jour sans être encore « de garde ». Renvoie l'heure de
 * début ('HH:MM') ou null. Les pages de garde listent ces pharmacies pour la
 * date du jour ; l'annuaire doit les retrouver avec le filtre « De garde ».
 */
export function gardeLaterToday(garde: GardeWindow[], nowMs: number): string | null {
  const dayStart = Math.floor((nowMs + ALGIERS_OFFSET_MS) / 86_400_000) * 86_400_000 - ALGIERS_OFFSET_MS
  const dayEnd = dayStart + 86_400_000
  const next = garde.filter(([start]) => start > nowMs && start < dayEnd).sort((a, b) => a[0] - b[0])[0]
  return next ? formatAlgiersTime(next[0]) : null
}

/** Ouverte au sens large : de garde, ouverte ou sur le point de fermer. */
export function isAvailableNow(status: OpenStatus): boolean {
  return status.state !== 'closed'
}

export const WEEKDAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
export const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Ordre d'affichage : semaine algérienne, du samedi au vendredi. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]

/** schema.org/openingHoursSpecification (hors garde, qui est saisonnière). */
export function openingHoursSpec(hours: PharmacyHours) {
  const { opens, closes } = effectiveHours(hours)
  return SCHEMA_DAYS
    .map((dayOfWeek, i) => ({ dayOfWeek, i }))
    .filter(d => !hours.closedDays.includes(d.i))
    .map(d => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: d.dayOfWeek, opens, closes }))
}
