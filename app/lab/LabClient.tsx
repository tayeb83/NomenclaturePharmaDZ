'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'

type Carte = { href: string; icone: string; fr: { titre: string; texte: string }; ar: { titre: string; texte: string }; exemple?: { fr: string; ar: string } }

const CARTES: Carte[] = [
  {
    href: '/lab/guide',
    icone: '🧭',
    fr: { titre: 'Recherche guidée', texte: 'Trouver un médicament pas à pas : la substance, puis la voie, la forme et le dosage. Chaque choix devient une pastille reliée par une flèche.' },
    ar: { titre: 'البحث الموجَّه', texte: 'اعثر على دواء خطوة بخطوة: المادة الفعالة، ثم طريقة الاستعمال، فالشكل والجرعة. كل اختيار يصبح شارة يربطها سهم.' },
    exemple: { fr: 'amoxicilline → à boire → poudre pour suspension → 250 mg/5 ml', ar: 'أموكسيسيلين ← للشرب ← مسحوق لمعلق ← 250 ملغ/5 مل' },
  },
  {
    href: '/terminologies',
    icone: '📚',
    fr: { titre: 'Terminologies', texte: 'Les référentiels des fiches : formes, voies et méthodes d’administration (EDQM), unités (UCUM) et classification ATC, en trois langues.' },
    ar: { titre: 'المصطلحات', texte: 'مراجع البطاقات: الأشكال وطرق وأساليب الإعطاء (EDQM)، والوحدات (UCUM)، والتصنيف ATC، بثلاث لغات.' },
  },
  {
    href: '/recherche',
    icone: '🔍',
    fr: { titre: 'Facettes dans la recherche', texte: 'Déjà intégrées à la recherche de médicaments : affinez les résultats par voie, forme, dosage et origine, avec les compteurs de toute la requête.' },
    ar: { titre: 'الواجهات في البحث', texte: 'مدمجة في بحث الأدوية: ضيّق النتائج حسب طريقة الاستعمال والشكل والجرعة والمصدر مع أعداد كامل الطلب.' },
    exemple: { fr: 'Essayez « amoxicilline » puis cliquez sur « À boire ».', ar: 'جرّب «amoxicilline» ثم اضغط على «فموي سائل».' },
  },
]

export function LabClient() {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  return (
    <div dir={ar ? 'rtl' : 'ltr'}>
      <div className="page-header">
        <div className="container">
          <h1>🧪 {ar ? 'المختبر' : 'Lab'}</h1>
          <p style={{ maxWidth: 720 }}>
            {ar ? 'ميزات قيد التجربة. قد تتغير أو تختفي دون إشعار.' : 'Fonctions en cours d’essai. Elles peuvent changer ou disparaître sans préavis.'}
          </p>
        </div>
      </div>
      <div className="page-body">
        <div className="container lab-cartes">
          {CARTES.map(c => (
            <Link key={c.href} href={c.href} className="lab-carte">
              <span className="lab-carte-icone" aria-hidden>{c.icone}</span>
              <strong>{ar ? c.ar.titre : c.fr.titre}</strong>
              <span>{ar ? c.ar.texte : c.fr.texte}</span>
              {c.exemple && <em>{ar ? c.exemple.ar : c.exemple.fr}</em>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
