/**
 * Rate limiting en mémoire pour les routes API Node (best-effort par
 * instance serverless — suffisant pour ralentir fortement un brute-force
 * ou un scraping en rafale, sans dépendance externe).
 */

type Bucket = { count: number; resetAt: number }

const globalForRateLimit = globalThis as unknown as {
  _rateLimitBuckets?: Map<string, Bucket>
}

const buckets: Map<string, Bucket> =
  globalForRateLimit._rateLimitBuckets ?? new Map()
globalForRateLimit._rateLimitBuckets = buckets

/**
 * Incrémente le compteur `key` et indique si la limite est dépassée.
 * @returns null si autorisé, sinon le nombre de secondes avant réessai.
 */
export function rateLimit(key: string, limit: number, windowMs: number): number | null {
  const now = Date.now()

  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.resetAt < now) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  bucket.count++
  if (bucket.count > limit) return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  return null
}

/** Extrait l'IP client d'une requête (Vercel place l'IP réelle en tête de x-forwarded-for). */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
