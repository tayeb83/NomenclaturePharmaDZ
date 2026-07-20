import type { Metadata } from 'next'
import { getGardeCoverage, groupByWilaya } from '@/lib/garde'
import { GardeHubList } from '@/app/pharmacie-de-garde/GardeHubList'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'صيدلية الحراسة في الجزائر — حسب البلدية | DwaDZ',
  description: 'ابحث عن صيدلية الحراسة المفتوحة اليوم أو هذه الليلة أو يوم الجمعة في بلديتك — وهران، سيدي بلعباس، سعيدة وجميع الولايات المغطاة. قوائم رسمية من مديريات الصحة والسكان.',
  keywords: [
    'صيدلية الحراسة الجزائر', 'صيدلية مناوبة', 'صيدلية الحراسة وهران',
    'صيدلية الحراسة سيدي بلعباس', 'صيدلية الحراسة سعيدة', 'صيدلية الليل الجزائر',
  ],
  alternates: {
    canonical: `${APP_URL}/ar/pharmacie-de-garde`,
    languages: { fr: `${APP_URL}/pharmacie-de-garde`, ar: `${APP_URL}/ar/pharmacie-de-garde`, 'x-default': `${APP_URL}/pharmacie-de-garde` },
  },
  openGraph: {
    title: 'صيدلية الحراسة في الجزائر — حسب البلدية | DwaDZ',
    description: 'قوائم رسمية حسب الولاية والبلدية — العناوين، الهواتف، أوقات المناوبة.',
    url: `${APP_URL}/ar/pharmacie-de-garde`,
    type: 'website',
    locale: 'ar_DZ',
  },
}

export default async function GardeHubPageAr() {
  const coverage = await getGardeCoverage()
  const groups = groupByWilaya(coverage)

  return (
    <div className="container" dir="rtl" lang="ar" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: 'var(--navy)' }}>
          🏥 صيدلية الحراسة في الجزائر، حسب البلدية
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 16, maxWidth: 640, lineHeight: 1.6 }}>
          اختر بلديتك لعرض قائمة صيدليات الحراسة اليوم أو هذه الليلة أو يوم الجمعة —
          الأسماء والعناوين وأرقام الهاتف وأوقات المناوبة، من القوائم الرسمية لمديريات الصحة والسكان (DSP).
        </p>
        <p style={{ fontSize: 13, marginTop: 8 }}>
          <a href="/pharmacie-de-garde" style={{ color: 'var(--blue)' }}>En français</a>
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="alert-banner info">لا توجد بلدية مغطاة حاليًا — عودوا قريبًا.</div>
      ) : (
        <GardeHubList groups={groups} lang="ar" basePath="/ar/pharmacie-de-garde" />
      )}
    </div>
  )
}
