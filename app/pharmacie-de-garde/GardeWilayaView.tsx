import { notFound } from 'next/navigation'
import { getGardeCoverage, getGardeNow, buildWilayaHub, slugify } from '@/lib/garde'
import type { WilayaHubEntry } from '@/lib/garde'
import type { GardeShift } from '@/lib/db-types'
import type { Lang } from '@/lib/i18n'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export type WilayaPageData = {
  wilaya: WilayaHubEntry
  /** Commune principale (chef-lieu) dont les gardes du jour sont rendues dans le HTML. */
  mainCommune: WilayaHubEntry['communes'][number] | null
  shifts: GardeShift[]
}

/**
 * Charge la wilaya demandée (404 si le slug est inconnu) et, pour son
 * chef-lieu, les gardes du jour. Le chef-lieu est la commune de même nom que
 * la wilaya (Oran, Saïda…), sinon l'unique commune couverte.
 */
export async function loadWilayaPage(wilayaSlug: string): Promise<WilayaPageData> {
  const coverage = await getGardeCoverage()
  const wilaya = buildWilayaHub(coverage).find(w => w.slug === wilayaSlug)
  if (!wilaya) notFound()

  const mainCommune =
    wilaya.communes.find(c => slugify(c.commune_name_fr) === wilaya.slug) ||
    (wilaya.communes.length === 1 ? wilaya.communes[0] : null)

  const shifts = mainCommune
    ? (await getGardeNow(mainCommune.wilaya_code, mainCommune.commune_code).catch(() => null))?.day_schedule ?? []
    : []

  return { wilaya, mainCommune, shifts }
}

const T = {
  fr: {
    home: 'Accueil',
    hub: 'Pharmacies de garde',
    h1: (w: string) => `Pharmacie de garde à ${w}`,
    intro: (w: string) =>
      `Pharmacies de garde de la wilaya de ${w} : noms, adresses, téléphones et horaires, d'après les listes officielles de la Direction de la Santé et de la Population (DSP).`,
    today: (c: string, d: string) => `De garde aujourd'hui à ${c} (${d})`,
    none: 'Aucune garde n’est enregistrée pour aujourd’hui.',
    fullPage: (c: string) => `Voir tous les horaires de garde à ${c} →`,
    communes: (w: string) => `Communes de la wilaya de ${w}`,
    soon: 'Le programme de garde de cette wilaya n’est pas encore disponible.',
    other: 'En arabe',
    hours: 'Horaire',
    locale: 'fr-FR',
  },
  ar: {
    home: 'الرئيسية',
    hub: 'صيدليات المناوبة',
    h1: (w: string) => `صيدلية المناوبة في ${w}`,
    intro: (w: string) =>
      `صيدليات المناوبة في ولاية ${w}: الأسماء والعناوين وأرقام الهاتف وأوقات المناوبة، من القوائم الرسمية لمديرية الصحة والسكان.`,
    today: (c: string, d: string) => `صيدليات المناوبة اليوم في ${c} (${d})`,
    none: 'لا توجد مناوبة مسجلة لهذا اليوم.',
    fullPage: (c: string) => `← عرض كل أوقات المناوبة في ${c}`,
    communes: (w: string) => `بلديات ولاية ${w}`,
    soon: 'برنامج المناوبة لهذه الولاية غير متوفر بعد.',
    other: 'En français',
    hours: 'التوقيت',
    locale: 'ar-DZ',
  },
}

function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Algiers' }).format(new Date(iso))
}

export function GardeWilayaView({ data, lang }: { data: WilayaPageData; lang: Lang }) {
  const t = T[lang]
  const { wilaya, mainCommune, shifts } = data
  const basePath = lang === 'ar' ? '/ar/pharmacie-de-garde' : '/pharmacie-de-garde'
  const otherPath = lang === 'ar' ? `/pharmacie-de-garde/${wilaya.slug}` : `/ar/pharmacie-de-garde/${wilaya.slug}`
  const wilayaName = lang === 'ar' ? wilaya.name_ar || wilaya.name_fr : wilaya.name_fr
  const communeName = (c: WilayaHubEntry['communes'][number]) =>
    lang === 'ar' ? c.commune_name_ar || c.commune_name_fr : c.commune_name_fr
  const today = new Intl.DateTimeFormat(t.locale, { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Algiers' }).format(new Date())

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.home, item: APP_URL },
      { '@type': 'ListItem', position: 2, name: t.hub, item: `${APP_URL}${basePath}` },
      { '@type': 'ListItem', position: 3, name: wilayaName, item: `${APP_URL}${basePath}/${wilaya.slug}` },
    ],
  }

  const listLd = shifts.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t.h1(wilayaName),
        itemListElement: shifts.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Pharmacy',
            name: s.name_fr || s.name_ar,
            address: {
              '@type': 'PostalAddress',
              streetAddress: s.address_fr || s.address_ar || undefined,
              addressLocality: mainCommune?.commune_name_fr,
              addressRegion: wilaya.name_fr,
              addressCountry: 'DZ',
            },
            ...(s.phone_e164 ? { telephone: s.phone_e164 } : {}),
          },
        })),
      }
    : null

  return (
    <div className="container" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {listLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} />}

      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 16 }}>
        <a href="/" style={{ color: 'var(--slate-500)' }}>{t.home}</a> {' › '}
        <a href={basePath} style={{ color: 'var(--slate-500)' }}>{t.hub}</a> {' › '}
        <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{wilayaName}</span>
      </nav>

      <p style={{ fontSize: 13, marginBottom: 8 }}>
        <a href={otherPath} style={{ color: 'var(--blue)' }}>{t.other}</a>
      </p>

      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: 'var(--navy)' }}>🏥 {t.h1(wilayaName)}</h1>
      <p style={{ color: 'var(--slate-500)', fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>{t.intro(wilayaName)}</p>

      {!wilaya.covered && <div className="alert-banner info">{t.soon}</div>}

      {mainCommune && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
            {t.today(communeName(mainCommune), today)}
          </h2>
          {shifts.length === 0 ? (
            <p style={{ color: 'var(--slate-500)' }}>{t.none}</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              {shifts.map(s => {
                const name = (lang === 'ar' ? s.name_ar || s.name_fr : s.name_fr || s.name_ar) || 'Pharmacie'
                const address = lang === 'ar' ? s.address_ar || s.address_fr : s.address_fr || s.address_ar
                return (
                  <li key={s.id} style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{name}</div>
                    {address && <div style={{ fontSize: 14, color: 'var(--slate-600, #475569)', marginTop: 2 }}>{address}</div>}
                    <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>{t.hours} : {formatTime(s.starts_at, t.locale)} – {formatTime(s.ends_at, t.locale)}</span>
                      {s.phone_e164 && (
                        <a href={`tel:${s.phone_e164}`} dir="ltr" style={{ color: 'var(--blue)', fontWeight: 600 }}>{s.phone_e164}</a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p style={{ marginTop: 14 }}>
            <a href={`${basePath}/${wilaya.slug}/${slugify(mainCommune.commune_name_fr)}`} style={{ color: 'var(--blue)', fontWeight: 600 }}>
              {t.fullPage(communeName(mainCommune))}
            </a>
          </p>
        </section>
      )}

      {wilaya.communes.length > 0 && (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>{t.communes(wilayaName)}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {wilaya.communes.map(c => (
              <a
                key={c.commune_code}
                href={`${basePath}/${wilaya.slug}/${slugify(c.commune_name_fr)}`}
                style={{
                  fontSize: 13.5, fontWeight: 600, color: 'var(--slate-700)', textDecoration: 'none',
                  background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 999, padding: '6px 12px',
                }}
              >
                {communeName(c)}
              </a>
            ))}
          </div>
        </section>
      )}
      <AdInContent />
    </div>
  )
}
