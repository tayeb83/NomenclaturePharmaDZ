/**
 * Interactions médicamenteuses du Thesaurus ANSM : extraction (data/ansm/interactions_fr.json)
 * et rapprochement d'une fiche avec le thésaurus (lib/interactions-core.ts). Sans base de données.
 *   node --test tests/interactions/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  NIVEAUX, buildThesaurusIndex, cle, classeDuPartenaire, grouperParNiveau, membresDeClasse, resoudreDci,
  substancesDeDci, toItem, trierItems, type ClasseLien, type InteractionRow,
} from '../../lib/interactions-core.ts'

type Json = {
  substances: { nom: string; voir_aussi: string[]; membres?: string[] }[]
  interactions: { substance: string; partenaire: string; niveau: string; niveaux?: string[]; risque: string; conduite: string; page: number }[]
}
const data: Json = JSON.parse(readFileSync(new URL('../../data/ansm/interactions_fr.json', import.meta.url), 'utf8'))

// Mêmes liens que scripts/import_ansm_interactions.py
const titres = data.substances.map(s => s.nom)
const parCle = new Map(titres.map(t => [cle(t), t]))
const liens: ClasseLien[] = []
for (const s of data.substances) {
  for (const m of s.membres ?? []) liens.push({ classe: s.nom, membre: m })
  for (const v of s.voir_aussi) liens.push({ classe: parCle.get(cle(v)) ?? v, membre: s.nom })
}
const index = buildThesaurusIndex(titres, liens)

test('extraction : une interaction par ligne « + » du PDF, niveaux connus, textes présents', () => {
  assert.equal(data.interactions.length, 3216)
  const valides = new Set<string>(NIVEAUX)
  for (const i of data.interactions) {
    assert.ok(valides.has(i.niveau), `${i.substance} + ${i.partenaire}`)
    assert.ok(i.risque.trim(), `risque vide : ${i.substance} + ${i.partenaire}`)
    assert.ok(i.page >= 3)
    for (const n of i.niveaux ?? []) assert.ok(valides.has(n))
  }
  const paires = new Set(data.interactions.map(i => `${cle(i.substance)}|${cle(i.partenaire)}`))
  assert.equal(paires.size, data.interactions.length, 'une paire substance/partenaire ne doit apparaître qu\'une fois')
})

test('extraction : ABIRATÉRONE, tel que dans le thésaurus', () => {
  const l = data.interactions.filter(i => i.substance === 'ABIRATERONE')
  assert.deepEqual(l.map(i => [i.partenaire, i.niveau]), [
    ['INDUCTEURS ENZYMATIQUES PUISSANTS', 'deconseillee'],
    ['METOPROLOL', 'precaution_emploi'],
    ['PROPAFENONE', 'precaution_emploi'],
    ['RIFAMPICINE', 'deconseillee'],
  ])
  assert.equal(l[0].conduite, '')
  assert.match(l[1].conduite, /^Surveillance clinique\. Si besoin, adaptation de la posologie du métoprolol/)
})

test('extraction : amiodarone + simvastatine, précaution d\'emploi avec conduite à tenir', () => {
  const i = data.interactions.find(x => x.substance === 'SIMVASTATINE' && x.partenaire === 'AMIODARONE')!
  assert.equal(i.niveau, 'precaution_emploi')
  assert.match(i.risque, /rhabdomyolyse/)
  assert.match(i.conduite, /20 mg\/j de simvastatine/)
  assert.ok(data.interactions.some(x => x.substance === 'AMIODARONE' && x.partenaire === 'SIMVASTATINE'))
})

test('extraction : une ligne à plusieurs niveaux garde le plus grave et le détail par condition', () => {
  const i = data.interactions.find(x => x.substance === 'ACIDE ACETYLSALICYLIQUE' && x.partenaire === 'ANTICOAGULANTS ORAUX')!
  assert.equal(i.niveau, 'contre_indication')
  assert.deepEqual(i.niveaux, ['contre_indication', 'deconseillee', 'a_prendre_en_compte'])
  assert.match(i.conduite, /^Contre-indication avec :\n- des doses anti-inflammatoires/)
  assert.match(i.conduite, /\nA prendre en compte avec :/)
})

test('substances d\'une DCI : associations, sels « exprimé en », équivalents connus', () => {
  assert.deepEqual(substancesDeDci('AMOXICILLINE + ACIDE CLAVULANIQUE'), ['AMOXICILLINE', 'ACIDE CLAVULANIQUE'])
  assert.deepEqual(substancesDeDci('AMLODIPINE/VALSARTAN'), ['AMLODIPINE', 'VALSARTAN'])
  assert.deepEqual(substancesDeDci('ATORVASTATINE CALCIQUE TRIHYDRATE EXPRIME EN ATORVASTATINE'), ['ATORVASTATINE CALCIQUE TRIHYDRATE', 'ATORVASTATINE'])
  assert.deepEqual(substancesDeDci('VALPROATE DE SODIUM'), ['ACIDE VALPROIQUE'])
})

test('rapprochement : substance, sels, classes', () => {
  const amio = resoudreDci(index, 'AMIODARONE CHLORHYDRATE')
  assert.deepEqual(amio.titres, ['AMIODARONE'])
  assert.ok(amio.classes.includes('SUBSTANCES SUSCEPTIBLES DE DONNER DES TORSADES DE POINTES'))

  const abi = resoudreDci(index, 'ABIRATERONE ACETATE')
  assert.deepEqual(abi.titres, ['ABIRATERONE'])
  assert.deepEqual(abi.classes, ["MÉDICAMENTS À L'ORIGINE D'UN HYPOGONADISME MASCULIN"])

  const atorva = resoudreDci(index, 'ATORVASTATINE CALCIQUE TRIHYDRATE EXPRIME EN ATORVASTATINE')
  assert.ok(atorva.classes.includes("INHIBITEURS DE L'HMG-COA RÉDUCTASE (STATINES)"))

  // sans titre propre, la substance est reconnue par la liste des membres de sa classe
  const amox = resoudreDci(index, 'AMOXICILLINE + ACIDE CLAVULANIQUE')
  assert.deepEqual(amox.titres, [])
  assert.ok(amox.classes.includes('PÉNICILLINES'))
})

test('rapprochement : jamais de lien pour une substance absente du thésaurus', () => {
  for (const dci of ['EAU POUR PREPARATIONS INJECTABLES', '', 'ZZZ INCONNUE']) {
    assert.deepEqual(resoudreDci(index, dci), { titres: [], classes: [] }, dci)
  }
  // le thésaurus écrit « SODIUM (CHLORURE DE) » : l'ordre des mots de la nomenclature n'empêche pas le lien
  assert.deepEqual(resoudreDci(index, 'SODIUM CHLORURE').titres, ['SODIUM (CHLORURE DE)'])
})

const ligne = (o: Partial<InteractionRow>): InteractionRow => ({
  id: 1, substance: 'AMIODARONE', partenaire: 'SIMVASTATINE', partenaire_est_classe: false, niveau: 'precaution_emploi', niveaux: null,
  risque_fr: 'Risque FR', conduite_fr: 'Conduite FR', risque_ar: null, conduite_ar: null, partenaire_ar: null, ar_statut: 'absent', page: 13, source_version: 'v', ...o,
})

test('texte arabe : utilisé s\'il est complet, sinon le français d\'origine, jamais un mélange', () => {
  const directs = new Set(['AMIODARONE'])
  assert.equal(toItem(ligne({}), 'fr', directs).langue, 'fr')
  assert.equal(toItem(ligne({}), 'ar', directs).risque, 'Risque FR')
  const complet = toItem(ligne({ risque_ar: 'خطر', conduite_ar: 'سلوك', partenaire_ar: 'سيمفاستاتين' }), 'ar', directs)
  assert.deepEqual([complet.langue, complet.risque, complet.conduite, complet.partenaire], ['ar', 'خطر', 'سلوك', 'سيمفاستاتين'])
  assert.equal(complet.partenaire_origine, 'SIMVASTATINE')
  assert.equal(complet.relue, false)
  assert.equal(toItem(ligne({ risque_ar: 'خطر', conduite_ar: 'سلوك', ar_statut: 'relu' }), 'ar', directs).relue, true)
  assert.equal(toItem(ligne({}), 'ar', directs).relue, null)
  assert.equal(toItem(ligne({}), 'ar', directs).partenaire_origine, null)
  const partiel = toItem(ligne({ risque_ar: 'خطر', conduite_ar: null }), 'ar', directs)
  assert.deepEqual([partiel.langue, partiel.risque, partiel.conduite], ['fr', 'Risque FR', 'Conduite FR'])
  // sans conduite à tenir dans la source, le risque traduit suffit
  assert.equal(toItem(ligne({ conduite_fr: '', risque_ar: 'خطر' }), 'ar', directs).langue, 'ar')
  assert.equal(toItem(ligne({ risque_ar: 'خطر', conduite_ar: 'سلوك' }), 'fr', directs).risque, 'Risque FR')
})

test('tri et groupes : gravité, puis substance avant classe, puis alphabet', () => {
  const directs = new Set(['AMIODARONE'])
  const items = trierItems([
    toItem(ligne({ id: 1, partenaire: 'ZOLPIDEM', niveau: 'a_prendre_en_compte' }), 'fr', directs),
    toItem(ligne({ id: 2, partenaire: 'BETA', niveau: 'precaution_emploi', substance: 'CLASSE X' }), 'fr', directs),
    toItem(ligne({ id: 3, partenaire: 'ALPHA', niveau: 'precaution_emploi' }), 'fr', directs),
    toItem(ligne({ id: 4, partenaire: 'OMEGA', niveau: 'contre_indication' }), 'fr', directs),
  ])
  assert.deepEqual(items.map(i => i.id), [4, 3, 2, 1])
  assert.equal(items[2].via_classe, 'CLASSE X')
  assert.equal(items[1].via_classe, null)
  assert.deepEqual(grouperParNiveau(items).map(g => [g.niveau, g.items.length]), [
    ['contre_indication', 1], ['precaution_emploi', 2], ['a_prendre_en_compte', 1],
  ])
})

test('partenaire « AUTRES X » : liste des membres de la classe X', () => {
  assert.equal(classeDuPartenaire(index, 'AUTRES AMINOSIDES'), 'AMINOSIDES')
  assert.ok(membresDeClasse(index, 'AUTRES AMINOSIDES').some(m => /gentamicine/i.test(m)))
  assert.deepEqual(membresDeClasse(index, 'SIMVASTATINE'), [])
})

test('traductions arabes : chaque entrée vise un texte du thésaurus, garde ses nombres et ses paragraphes', () => {
  const ar = JSON.parse(readFileSync(new URL('../../data/ansm/interactions_ar.json', import.meta.url), 'utf8')) as {
    risques: Record<string, string>; conduites: Record<string, string>; partenaires: Record<string, string>
  }
  const fr = { risques: new Set(data.interactions.map(i => i.risque)), conduites: new Set(data.interactions.map(i => i.conduite)), partenaires: new Set(data.interactions.map(i => i.partenaire)) }
  const nombres = (s: string): string[] => s.match(/\d+(?:[.,]\d+)?/g) ?? []
  for (const k of ['risques', 'conduites', 'partenaires'] as const) {
    for (const [texte, trad] of Object.entries(ar[k])) {
      assert.ok(fr[k].has(texte), `${k} : texte français inconnu : ${texte.slice(0, 60)}`)
      assert.match(trad, /[؀-ۿ]/, `${k} : pas d'arabe : ${texte.slice(0, 60)}`)
      if (k === 'partenaires') continue
      for (const n of nombres(texte)) assert.ok(nombres(trad).includes(n), `${k} : nombre ${n} absent : ${texte.slice(0, 60)}`)
      assert.equal(trad.split('\n').length, texte.split('\n').length, `${k} : paragraphes : ${texte.slice(0, 60)}`)
    }
  }
})
