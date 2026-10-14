/**
 * Pages de l'annuaire, partagées entre les routes FR (/pharmacies…) et
 * AR (/ar/pharmacies…) : une seule implémentation pour que les deux
 * langues ne divergent pas. Rendu serveur (ISR) pour l'indexation ; le
 * statut « ouverte / fermée » est recalculé côté client à l'heure du
 * visiteur (voir DirectoryClient / FicheMain).
 */
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Lang } from '@/lib/i18n'
import {
  getDirectoryPharmacies, getDirectoryPharmacy, getDirectoryPlaces, getNeighbours,
  groupByWilaya, resolvePlace, titlePlaceFor,
} from '@/lib/annuaire'
import {
  displayName, formatPhoneDisplay, parsePharmacyParam, pharmacyPath, pharmacySlug, toListItem,
} from '@/lib/annuaire-types'
import { annuaireTitles, aFr, type TitlePlace } from '@/lib/annuaire-titles'
import { effectiveHours, openingHoursSpec } from '@/lib/annuaire-hours'
import { labels } from './labels'
import { DirectoryClient } from './DirectoryClient'
import { FicheMain } from './FicheMain'
import { HubSearch } from './HubSearch'
import { FicheMap } from './FicheMap'
import { GardeFeedback } from '@/components/garde/GardeFeedback'
import { AdInContent } from '@/components/ads/AdBanner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

/** /pharmacies, /pharmacies/saida, /pharmacies/mascara/maoussa (préfixe /ar en arabe). */
export function directoryPath(lang: Lang, wilayaSlug?: string, communeSlug?: string): string {
  return `${lang === 'ar' ? '/ar' : ''}/pharmacies${wilayaSlug ? `/${wilayaSlug}` : ''}${communeSlug ? `/${communeSlug}` : ''}`
}

function alternates(frPath: string, arPath: string, lang: Lang) {
  return {
    canonical: `${APP_URL}${lang === 'ar' ? arPath : frPath}`,
    languages: { fr: `${APP_URL}${frPath}`, ar: `${APP_URL}${arPath}`, 'x-default': `${APP_URL}${frPath}` },
  }
}

function ld(data: object) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="an-crumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i}>
          {it.href ? <a href={it.href}>{it.label}</a> : <strong style={{ color: 'var(--navy)' }}>{it.label}</strong>}
          {i < items.length - 1 && <span aria-hidden="true"> › </span>}
        </span>
      ))}
    </nav>
  )
}

function LangSwitch({ lang, frPath, arPath }: { lang: Lang; frPath: string; arPath: string }) {
  const t = labels(lang)
  return (
    <p style={{ fontSize: 13, margin: '0 0 10px' }}>
      <a href={lang === 'ar' ? frPath : arPath} style={{ color: 'var(--blue)' }}>{t.otherLang}</a>
    </p>
  )
}

function breadcrumbLd(items: { name: string; path: string }[]) {
  return ld({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${APP_URL}${it.path}` })),
  })
}

/* ─────────────── Accueil de l'annuaire ─────────────── */

export function hubMetadata(lang: Lang): Metadata {
  const titles = annuaireTitles(null, lang)
  return {
    title: titles.metaTitle,
    description: labels(lang).hubIntro,
    alternates: alternates('/pharmacies', '/ar/pharmacies', lang),
    openGraph: { title: titles.h1, description: labels(lang).hubIntro, url: `${APP_URL}${directoryPath(lang)}`, type: 'website', locale: lang === 'ar' ? 'ar_DZ' : 'fr_DZ' },
  }
}

export async function HubPage({ lang }: { lang: Lang }) {
  const t = labels(lang)
  const titles = annuaireTitles(null, lang)
  const groups = groupByWilaya(await getDirectoryPlaces())

  return (
    <div className="an-wrap" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      <Crumbs items={[{ href: lang === 'ar' ? '/ar' : '/', label: t.home }, { label: t.directory }]} />
      <LangSwitch lang={lang} frPath="/pharmacies" arPath="/ar/pharmacies" />
      <h1 className="an-h1">{titles.h1}</h1>
      <p className="an-lead">{t.hubIntro}</p>
      <HubSearch lang={lang} />

      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', margin: '0 0 12px' }}>{t.wilayas}</h2>
      <div className="an-wgrid">
        {groups.map(g => (
          <div key={g.wilaya_slug} className="an-wcard">
            <a href={directoryPath(lang, g.wilaya_slug)}>{lang === 'ar' ? g.wilaya_name_ar || g.wilaya_name_fr : g.wilaya_name_fr}</a>
            <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>{g.count} {t.pharmaciesIn}</div>
            {g.communes.length > 1 && (
              <details>
                <summary>{t.communes} ({g.communes.length})</summary>
                <ul>
                  {g.communes.map(c => (
                    <li key={c.commune_slug}>
                      <a href={directoryPath(lang, g.wilaya_slug, c.commune_slug)}>
                        {lang === 'ar' ? c.commune_name_ar || c.commune_name_fr : c.commune_name_fr}
                      </a>{' '}
                      <span style={{ color: 'var(--slate-500)' }}>({c.count})</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
      <p style={{ marginTop: 24, fontSize: 14 }}>
        <a href={lang === 'ar' ? '/ar/pharmacie-de-garde' : '/pharmacie-de-garde'} style={{ color: 'var(--blue)' }}>{t.gardeLink} →</a>
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>{t.disclaimer}</p>
      <AdInContent />
    </div>
  )
}

/* ─────────────── Wilaya / commune ─────────────── */

export async function placeMetadata(lang: Lang, wilayaSlug: string, communeSlug?: string): Promise<Metadata> {
  const place = await resolvePlace(wilayaSlug, communeSlug)
  if (!place) return { title: lang === 'ar' ? 'الصفحة غير موجودة' : 'Page introuvable', robots: { index: false } }
  const count = place.commune ? place.commune.count : place.wilaya.count
  const titles = annuaireTitles(place.title, lang, count)
  const url = `${APP_URL}${directoryPath(lang, wilayaSlug, communeSlug)}`
  return {
    title: titles.metaTitle,
    description: titles.description,
    alternates: alternates(directoryPath('fr', wilayaSlug, communeSlug), directoryPath('ar', wilayaSlug, communeSlug), lang),
    openGraph: { title: titles.h1, description: titles.description, url, type: 'website', locale: lang === 'ar' ? 'ar_DZ' : 'fr_DZ' },
  }
}

export async function PlacePage({ lang, wilayaSlug, communeSlug }: { lang: Lang; wilayaSlug: string; communeSlug?: string }) {
  const place = await resolvePlace(wilayaSlug, communeSlug)
  if (!place) notFound()

  const t = labels(lang)
  const pharmacies = await getDirectoryPharmacies(place.wilaya.wilaya_code, place.commune?.commune_code)
  const titles = annuaireTitles(place.title, lang, pharmacies.length)
  const wilayaName = lang === 'ar' ? place.wilaya.wilaya_name_ar || place.wilaya.wilaya_name_fr : place.wilaya.wilaya_name_fr
  const communeName = place.commune ? (lang === 'ar' ? place.commune.commune_name_ar || place.commune.commune_name_fr : place.commune.commune_name_fr) : null

  const crumbs = [
    { href: lang === 'ar' ? '/ar' : '/', label: t.home },
    { href: directoryPath(lang), label: t.directory },
    communeName ? { href: directoryPath(lang, wilayaSlug), label: wilayaName } : { label: wilayaName },
    ...(communeName ? [{ label: communeName }] : []),
  ]

  const itemList = ld({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: titles.h1,
    itemListElement: pharmacies.slice(0, 50).map((p, i) => ({
      '@type': 'ListItem', position: i + 1, url: `${APP_URL}${pharmacyPath(p, lang)}`, name: displayName(p, lang),
    })),
  })

  const gardeHref = place.commune
    ? `${lang === 'ar' ? '/ar' : ''}/pharmacie-de-garde/${wilayaSlug}/${communeSlug}`
    : `${lang === 'ar' ? '/ar' : ''}/pharmacie-de-garde`

  return (
    <div className="an-wrap" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      {itemList}
      {breadcrumbLd([
        { name: t.home, path: lang === 'ar' ? '/ar' : '/' },
        { name: t.directory, path: directoryPath(lang) },
        { name: wilayaName, path: directoryPath(lang, wilayaSlug) },
        ...(communeName ? [{ name: communeName, path: directoryPath(lang, wilayaSlug, communeSlug) }] : []),
      ])}
      <Crumbs items={crumbs} />
      <LangSwitch lang={lang} frPath={directoryPath('fr', wilayaSlug, communeSlug)} arPath={directoryPath('ar', wilayaSlug, communeSlug)} />
      <h1 className="an-h1">{titles.h1}</h1>
      <p className="an-lead">{t.placeIntro(pharmacies.length)}</p>

      {!place.commune && place.wilaya.communes.length > 1 && (
        <p style={{ fontSize: 14, marginBottom: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {place.wilaya.communes.map(c => (
            <a key={c.commune_slug} className="an-chip link" style={{ textDecoration: 'none' }} href={directoryPath(lang, wilayaSlug, c.commune_slug)}>
              {lang === 'ar' ? c.commune_name_ar || c.commune_name_fr : c.commune_name_fr} ({c.count})
            </a>
          ))}
        </p>
      )}

      <DirectoryClient
        lang={lang}
        renderedAt={Date.now()}
        pharmacies={pharmacies.map(toListItem)}
        communes={place.commune ? [] : place.wilaya.communes.map(c => ({ slug: c.commune_slug, name_fr: c.commune_name_fr, name_ar: c.commune_name_ar, count: c.count }))}
      />

      <p style={{ marginTop: 24, fontSize: 14 }}>
        <a href={gardeHref} style={{ color: 'var(--blue)' }}>{t.gardeLink} {lang === 'ar' ? '' : place.commune ? aFr(place.commune.commune_name_fr) : ''} →</a>
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>{t.disclaimer}</p>
      <AdInContent />
    </div>
  )
}

/* ─────────────── Fiche pharmacie ─────────────── */

async function loadFiche(param: string) {
  const parsed = parsePharmacyParam(param)
  if (!parsed) return null
  const pharmacy = await getDirectoryPharmacy(parsed.id)
  if (!pharmacy) return null
  return { pharmacy, parsed }
}

function ficheTexts(p: Awaited<ReturnType<typeof getDirectoryPharmacy>> & object, lang: Lang, place: TitlePlace) {
  const name = displayName(p, lang)
  const commune = lang === 'ar' ? p.commune_name_ar || p.commune_name_fr : p.commune_name_fr
  const wilaya = lang === 'ar' ? p.wilaya_name_ar || p.wilaya_name_fr : p.wilaya_name_fr
  const address = lang === 'ar' ? p.address_ar || p.address_fr : p.address_fr || p.address_ar
  const phone = formatPhoneDisplay(p.phone_e164, p.phone_raw)
  const { opens, closes } = effectiveHours(p.hours)
  const sameCommune = commune.trim().toLowerCase() === wilaya.trim().toLowerCase()
  void place
  if (lang === 'ar') {
    return {
      title: `${name}، صيدلية في ${commune}${sameCommune ? '' : ` (${wilaya})`}`,
      description: `${name}: صيدلية في ${commune}، ${wilaya}.${address ? ` العنوان: ${address}.` : ''}${phone ? ` الهاتف: ${phone}.` : ''} ساعات العمل ${opens} – ${closes} خارج المناوبة.`,
      commune, wilaya,
    }
  }
  return {
    title: `${name}, pharmacie ${aFr(commune)}${sameCommune ? '' : ` (${wilaya})`}`,
    description: `${name} : pharmacie ${aFr(commune)}${sameCommune ? '' : `, wilaya de ${wilaya}`}.${address ? ` Adresse : ${address}.` : ''}${phone ? ` Téléphone : ${phone}.` : ''} Ouverte de ${opens} à ${closes} hors garde.`,
    commune, wilaya,
  }
}

export async function ficheMetadata(lang: Lang, param: string): Promise<Metadata> {
  const found = await loadFiche(param)
  if (!found) return { title: lang === 'ar' ? 'الصيدلية غير موجودة' : 'Pharmacie introuvable', robots: { index: false } }
  const { pharmacy: p } = found
  const place = await titlePlaceFor(p)
  const texts = ficheTexts(p, lang, place)
  return {
    title: texts.title,
    description: texts.description,
    alternates: alternates(pharmacyPath(p, 'fr'), pharmacyPath(p, 'ar'), lang),
    openGraph: { title: texts.title, description: texts.description, url: `${APP_URL}${pharmacyPath(p, lang)}`, type: 'website', locale: lang === 'ar' ? 'ar_DZ' : 'fr_DZ' },
  }
}

export async function FichePage({ lang, param }: { lang: Lang; param: string }) {
  const found = await loadFiche(param)
  if (!found) notFound()
  const { pharmacy: p, parsed } = found

  // Lien stable : seul l'id compte. Un slug absent, ancien (pharmacie renommée) ou
  // mal recopié est redirigé vers l'adresse canonique.
  const canonical = pharmacyPath(p, lang)
  if (parsed.slug !== pharmacySlug(p)) permanentRedirect(canonical)

  const t = labels(lang)
  const [place, neighbours] = await Promise.all([titlePlaceFor(p), getNeighbours(p)])
  const texts = ficheTexts(p, lang, place)
  const name = displayName(p, lang)

  const { opens, closes } = effectiveHours(p.hours)
  const jsonLd = ld({
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    '@id': `${APP_URL}${pharmacyPath(p, 'fr')}`,
    name: p.name_fr || p.name_ar,
    ...(p.name_fr && p.name_ar ? { alternateName: p.name_ar } : {}),
    url: `${APP_URL}${canonical}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: p.address_fr || p.address_ar || undefined,
      addressLocality: p.commune_name_fr,
      addressRegion: p.wilaya_name_fr,
      addressCountry: 'DZ',
    },
    ...(p.phone_e164 ? { telephone: p.phone_e164 } : {}),
    ...(p.lat != null && p.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } } : {}),
    openingHoursSpecification: openingHoursSpec({ ...p.hours, opens, closes }),
    ...(p.photos.length ? { image: p.photos.map(ph => ph.url) } : {}),
  })

  // Commune et wilaya de même nom (Saïda, Mascara…) : un seul niveau dans le fil d'Ariane.
  const sameName = p.wilaya_slug === p.commune_slug
  const zoneCrumbs = sameName
    ? [{ href: directoryPath(lang, p.wilaya_slug, p.commune_slug), label: texts.commune }]
    : [
        { href: directoryPath(lang, p.wilaya_slug), label: texts.wilaya },
        { href: directoryPath(lang, p.wilaya_slug, p.commune_slug), label: texts.commune },
      ]
  const crumbs = [
    { href: lang === 'ar' ? '/ar' : '/', label: t.home },
    { href: directoryPath(lang), label: t.directory },
    ...zoneCrumbs,
    { label: name },
  ]

  return (
    <div className="an-wrap" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      {jsonLd}
      {breadcrumbLd([
        { name: t.home, path: lang === 'ar' ? '/ar' : '/' },
        { name: t.directory, path: directoryPath(lang) },
        ...zoneCrumbs.map(c => ({ name: c.label, path: c.href })),
        { name, path: canonical },
      ])}
      <Crumbs items={crumbs} />
      <LangSwitch lang={lang} frPath={pharmacyPath(p, 'fr')} arPath={pharmacyPath(p, 'ar')} />

      <div className="an-grid2">
        <FicheMain pharmacy={p} lang={lang} renderedAt={Date.now()} />

        <aside>
          {p.lat != null && p.lng != null && (
            <div className="an-map" style={{ height: 260 }}>
              <FicheMap lat={p.lat} lng={p.lng} name={name} />
            </div>
          )}

          {p.is_premium && p.photos.length > 0 && (
            <div className="an-panel">
              <div className="an-photos">
                {p.photos.slice(0, 6).map(ph => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={ph.url} src={ph.url} alt={ph.caption || name} loading="lazy" />
                ))}
              </div>
            </div>
          )}

          <div className="an-panel">
            <h2>{t.trust}</h2>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>
              {p.verified
                ? <>✓ {t.trustVerified(p.verified_at ? new Date(p.verified_at).toLocaleDateString(lang === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-FR') : null)}</>
                : t.trustUnverified}
            </p>
            <GardeFeedback
              lang={lang}
              wilayaCode={p.wilaya_code}
              communeCode={p.commune_code}
              pharmacyExternalId={p.external_id}
              pharmacyName={name}
            />
          </div>

          {neighbours.length > 0 && (
            <div className="an-panel">
              <h2>{t.nearby} {t.in} {texts.commune}</h2>
              <div className="an-list" style={{ gap: 8 }}>
                {neighbours.map(n => (
                  <a key={n.id} className="an-hit" href={pharmacyPath(n, lang)}>
                    <strong>{displayName(n, lang)}</strong>
                    <span>{lang === 'ar' ? n.address_ar || n.address_fr : n.address_fr || n.address_ar}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--slate-500)' }}>{t.disclaimer}</p>
    </div>
  )
}
