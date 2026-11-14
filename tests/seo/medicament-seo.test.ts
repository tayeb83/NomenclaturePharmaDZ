/**
 * Title et meta description des fiches médicament.
 *   node --test tests/seo/medicament-seo.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMedicamentDescription, buildMedicamentTitle, pickClasseAtc } from '../../lib/medicament-seo.ts'

const elerax = { nom_marque: 'ELERAX', dci: 'HYDROXYZINE', dosage: '25MG', forme: 'COMPRIME PELLICULE', labo: 'EL KENDI', source: 'enregistrement' }
const MAX_TITLE = 52
const MAX_DESCRIPTION = 158

test('title : dénomination latine, substance active, puis ce que la fiche contient', () => {
  assert.equal(buildMedicamentTitle(elerax, 'fr'), 'ELERAX 25 mg : hydroxyzine, équivalents en Algérie')
  assert.equal(buildMedicamentTitle(elerax, 'fr', { hasRcp: true }), 'ELERAX 25 mg : hydroxyzine, notice en Algérie')
  assert.equal(buildMedicamentTitle(elerax, 'ar'), 'ELERAX 25 mg (hydroxyzine) — البدائل في الجزائر')
})

test('title : le prix n\'est annoncé que si un PPA est saisi', () => {
  assert.equal(buildMedicamentTitle(elerax, 'fr', { ppa: 250 }), 'ELERAX 25 mg : hydroxyzine, prix en Algérie')
  assert.equal(buildMedicamentTitle(elerax, 'ar', { ppa: 250 }), 'ELERAX 25 mg (hydroxyzine) — السعر في الجزائر')
  for (const lang of ['fr', 'ar'] as const) {
    assert.doesNotMatch(buildMedicamentTitle(elerax, lang), /prix|السعر/)
    assert.doesNotMatch(buildMedicamentTitle(elerax, lang, { ppa: null }), /prix|السعر/)
    assert.doesNotMatch(buildMedicamentDescription(elerax, lang, { ppa: null }), /prix|PPA|السعر/i)
  }
})

test('title : la substance active passe avant la forme, la promesse avant la substance', () => {
  const collyre = { nom_marque: 'OPATEK', dci: 'OLOPATADINE', dosage: '1MG/ML', forme: 'COLLYRE EN SOLUTION', source: 'enregistrement' }
  assert.equal(buildMedicamentTitle(collyre, 'fr', { ppa: 320, hasRcp: true }), 'OPATEK 1 mg/ml : olopatadine, prix en Algérie')
  const assoc = { nom_marque: 'AUGMENTIN', dci: 'AMOXICILLINE/ACIDE CLAVULANIQUE', dosage: '1G/125MG', forme: 'POUDRE POUR SUSPENSION BUVABLE EN SACHET', source: 'enregistrement' }
  assert.equal(buildMedicamentTitle(assoc, 'fr', { ppa: 900 }), 'AUGMENTIN 1 g/125 mg : prix en Algérie')
  assert.equal(buildMedicamentTitle({ nom_marque: 'SEUL', source: 'enregistrement' }, 'fr'), 'SEUL : équivalents en Algérie')
})

test('title et description : longueurs bornées, même pour une dénomination démesurée', () => {
  const long = { nom_marque: 'X'.repeat(70), dci: 'D'.repeat(60), dosage: '500MG', forme: 'COMPRIME', labo: 'L'.repeat(80), source: 'enregistrement' }
  for (const lang of ['fr', 'ar'] as const) {
    for (const extras of [{}, { ppa: 1234.5, hasRcp: true, classe: 'C'.repeat(90) }]) {
      for (const med of [elerax, long, { nom_marque: 'SEUL' }]) {
        assert.ok(buildMedicamentTitle(med, lang, extras).length <= MAX_TITLE)
        assert.ok(buildMedicamentDescription(med, lang, extras).length <= MAX_DESCRIPTION)
      }
    }
  }
})

test('description : classe thérapeutique, prix, notice, laboratoire', () => {
  assert.equal(
    buildMedicamentDescription(elerax, 'fr', { hasRcp: true, classe: 'ANXIOLYTIQUES' }),
    'ELERAX 25 mg comprime pellicule : hydroxyzine (anxiolytiques). Notice officielle (RCP ANPP). Équivalents et statut en Algérie (nomenclature MIPH).'
  )
  assert.equal(
    buildMedicamentDescription(elerax, 'fr', { classe: 'Anxiolytiques' }),
    'ELERAX 25 mg comprime pellicule : hydroxyzine (anxiolytiques). Laboratoire EL KENDI. Équivalents et statut en Algérie (nomenclature MIPH).'
  )
  // Le prix passe avant la notice quand la place manque.
  assert.equal(
    buildMedicamentDescription(elerax, 'fr', { ppa: 250, hasRcp: true, classe: 'ANXIOLYTIQUES' }),
    'ELERAX 25 mg comprime pellicule : hydroxyzine (anxiolytiques). Prix public (PPA) : 250 DA. Équivalents et statut en Algérie (nomenclature MIPH).'
  )
  assert.match(buildMedicamentDescription(elerax, 'ar', { ppa: 250 }), /السعر العمومي \(PPA\): 250 دج\./)
})

test('description : une forme à rallonge cède avant la substance active', () => {
  const assoc = { nom_marque: 'AUGMENTIN', dci: 'AMOXICILLINE/ACIDE CLAVULANIQUE', dosage: '1G/125MG', forme: 'POUDRE POUR SUSPENSION BUVABLE EN SACHET', source: 'enregistrement' }
  assert.equal(
    buildMedicamentDescription(assoc, 'fr', { classe: 'BETALACTAMINES : PENICILLINES' }),
    'AUGMENTIN 1 g/125 mg : amoxicilline/acide clavulanique (betalactamines : penicillines). Équivalents et statut en Algérie (nomenclature MIPH).'
  )
  // Avec le prix, la classe cède à son tour ; la substance reste entière.
  assert.equal(
    buildMedicamentDescription(assoc, 'fr', { ppa: 900, classe: 'BETALACTAMINES : PENICILLINES' }),
    'AUGMENTIN 1 g/125 mg : amoxicilline/acide clavulanique. Prix public (PPA) : 900 DA. Équivalents et statut en Algérie (nomenclature MIPH).'
  )
})

test('fiches retirées ou non renouvelées : inchangées, sans prix ni notice', () => {
  const retire = { ...elerax, source: 'retrait' }
  assert.equal(buildMedicamentTitle(retire, 'fr', { ppa: 250, hasRcp: true }), 'ELERAX 25 mg comprime pellicule : retiré')
  assert.match(buildMedicamentDescription(retire, 'fr', { ppa: 250 }), /^ELERAX 25 mg comprime pellicule \(HYDROXYZINE\) — laboratoire EL KENDI\. Médicament retiré/)
  assert.equal(buildMedicamentTitle({ ...elerax, source: 'non_renouvele' }, 'ar'), 'ELERAX 25 mg comprime pellicule — AMM غير مجددة')
})

test('classe ATC : niveau 3 de la branche du code de la fiche', () => {
  const h = [
    { code: 'N', niveau: 1, label_fr: 'SYSTEME NERVEUX' },
    { code: 'N05', niveau: 2, label_fr: 'PSYCHOLEPTIQUES' },
    { code: 'R06A', niveau: 3, label_fr: 'ANTIHISTAMINIQUES A USAGE SYSTEMIQUE' },
    { code: 'N05B', niveau: 3, label_fr: 'ANXIOLYTIQUES', label_ar: 'مزيلات القلق' },
    { code: 'N05BB', niveau: 4, label_fr: 'DERIVES DU DIPHENYLMETHANE' },
  ]
  assert.equal(pickClasseAtc(h, 'N05BB01', 'fr'), 'ANXIOLYTIQUES')
  assert.equal(pickClasseAtc(h, 'N05BB01', 'ar'), 'مزيلات القلق')
  assert.equal(pickClasseAtc(h, null, 'fr'), 'ANTIHISTAMINIQUES A USAGE SYSTEMIQUE')
  assert.equal(pickClasseAtc([h[0], h[1]], 'N05BB01', 'fr'), 'PSYCHOLEPTIQUES')
  assert.equal(pickClasseAtc([], 'N05BB01', 'fr'), null)
})
