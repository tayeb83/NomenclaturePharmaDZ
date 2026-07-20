import type { GardeWilayaGroup } from '@/lib/garde'
import { slugify } from '@/lib/slug'
import type { Lang } from '@/lib/i18n'

export function GardeHubList({ groups, lang, basePath }: { groups: GardeWilayaGroup[]; lang: Lang; basePath: string }) {
  return (
    <div style={{ display: 'grid', gap: 28 }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {groups.map(group => {
        const wilayaSlug = slugify(group.wilaya_name_fr)
        const wilayaName = lang === 'ar' ? (group.wilaya_name_ar || group.wilaya_name_fr) : group.wilaya_name_fr
        return (
          <section key={group.wilaya_code} id={wilayaSlug}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>{wilayaName}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.communes.map(c => {
                const communeSlug = slugify(c.commune_name_fr)
                const communeName = lang === 'ar' ? (c.commune_name_ar || c.commune_name_fr) : c.commune_name_fr
                return (
                  <a
                    key={c.commune_code}
                    href={`${basePath}/${wilayaSlug}/${communeSlug}`}
                    style={{
                      display: 'inline-block', background: '#fff', border: '1px solid var(--slate-200)',
                      borderRadius: 8, padding: '8px 14px', fontSize: 13.5, color: 'var(--slate-700)',
                      textDecoration: 'none', fontWeight: 600,
                    }}
                  >
                    {communeName}
                  </a>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
