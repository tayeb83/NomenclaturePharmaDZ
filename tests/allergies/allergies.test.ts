/**
 * Allergies HDO : rapprochement d'une fiche et filtre de recherche (lib/allergies-core.ts). Sans base de données.
 *   node --test tests/allergies/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALLERGIES_HDO } from '../../lib/allergies-data.ts'
import { CHOIX_ALLERGIES } from '../../lib/allergies-choix.ts'
import { allergieParCode, allergiesDeDci, dcisConcernees, filtreAllergie, nomAgent } from '../../lib/allergies-core.ts'

const codes = (l: { allergie: { code: string } }[]) => l.map(m => m.allergie.code)

test('données : seules les allergies utilisables, sans code SNOMED ni UMLS', () => {
  assert.equal(ALLERGIES_HDO.length, 59) // 51 en fiche + 7 excipients + le latex (« fish allergy » compte une fois)
  assert.deepEqual([...new Set(ALLERGIES_HDO.map(a => a.perimetre))].sort(), ['conditionnement', 'excipient', 'fiche'])
  assert.equal(new Set(ALLERGIES_HDO.map(a => a.code)).size, ALLERGIES_HDO.length)
  assert.ok(!JSON.stringify(ALLERGIES_HDO).match(/snomed|umls/i))
  for (const a of ALLERGIES_HDO) assert.match(a.code, /^\d{4,7}$/)
  for (const a of ALLERGIES_HDO.filter(x => x.perimetre === 'fiche')) {
    assert.ok(a.relation !== 'aucun', a.code)
    assert.ok(a.relation === 'classe' ? a.atc.length > 0 : !!a.cle && a.noms.length > 0, a.code)
  }
  assert.equal(CHOIX_ALLERGIES.length, ALLERGIES_HDO.filter(a => a.perimetre === 'fiche').length)
})

test('substance : l\'amoxicilline retrouve son allergie, avec ses sels', () => {
  for (const dci of ['AMOXICILLINE', 'AMOXICILLINE TRIHYDRATE', 'Amoxicilline  ']) {
    assert.deepEqual(codes(allergiesDeDci(dci, 'J01CA04').substance), ['0040004'], dci)
  }
})

test('classes : l\'amoxicilline remonte aux pénicillines puis aux bêta-lactamines, la plus précise d\'abord', () => {
  const r = allergiesDeDci('AMOXICILLINE', 'J01CA04')
  assert.deepEqual(codes(r.classes), ['0060520', '0060519'])
  assert.deepEqual(r.classes.map(m => m.via), ['J01C', 'J01C'])
  assert.deepEqual(r.classes.map(m => m.relation), ['classe', 'classe'])
})

test('pas d\'allergie croisée : la ceftriaxone n\'est pas rattachée aux pénicillines, ni l\'amoxicilline aux céphalosporines', () => {
  const cef = allergiesDeDci('CEFTRIAXONE SODIQUE', 'J01DD04')
  assert.deepEqual(codes(cef.substance), ['0040005'])
  assert.deepEqual(codes(cef.classes).sort(), ['0040021', '0060519'])
  assert.ok(!codes(cef.classes).includes('0060520'))
  const amox = allergiesDeDci('AMOXICILLINE', 'J01CA04')
  assert.ok(!codes([...amox.substance, ...amox.classes]).includes('0040021'))
})

test('association : le co-trimoxazole demande ses deux composants', () => {
  const r = allergiesDeDci('SULFAMETHOXAZOLE + TRIMETHOPRIME', 'J01EE01')
  assert.deepEqual(codes(r.substance).sort(), ['0040016', '0040029', '0040070'])
  assert.deepEqual(codes(r.classes), ['0040015'])
  // le triméthoprime seul n'est pas un sulfamide, et ne déclenche pas l'association
  const tmp = allergiesDeDci('TRIMETHOPRIME', 'J01EA01')
  assert.deepEqual(codes(tmp.substance), ['0040029'])
  assert.deepEqual(codes(tmp.classes), [])
  assert.deepEqual(codes(allergiesDeDci('SULFAMETHOXAZOLE', 'J01EC01').substance), ['0040016'])
})

test('association avec un inhibiteur : amoxicilline + acide clavulanique reste dans les pénicillines', () => {
  const r = allergiesDeDci('AMOXICILLINE + ACIDE CLAVULANIQUE', 'J01CR02')
  assert.deepEqual(codes(r.substance), ['0040004'])
  assert.deepEqual(codes(r.classes), ['0060520', '0060519'])
})

test('synonymes et sels : aspirine, suxaméthonium, lidocaïne chlorhydrate, néomycine sulfate, kétoprofène', () => {
  assert.deepEqual(codes(allergiesDeDci('ASPIRINE', 'N02BA01').substance), ['0040002'])
  assert.deepEqual(codes(allergiesDeDci('ACIDE ACETYLSALICYLIQUE', null).substance), ['0040002'])
  assert.deepEqual(codes(allergiesDeDci('SUXAMETHONIUM CHLORURE', 'M03AB01').substance), ['0040028'])
  assert.deepEqual(codes(allergiesDeDci('SUCCINYLCHOLINE', null).substance), ['0040028'])
  assert.deepEqual(codes(allergiesDeDci('LIDOCAINE CHLORHYDRATE', 'N01BB02').substance), ['0040009'])
  assert.deepEqual(codes(allergiesDeDci('NEOMYCINE SULFATE', 'J01GB05').substance), ['0040067'])
  assert.deepEqual(codes(allergiesDeDci('KETOPROFENE', 'M01AE03').substance), ['0040060'])
})

test('prudence : le paracétamol, la dexkétoprofène et un nom inconnu ne produisent aucun lien', () => {
  for (const [dci, atc] of [['PARACETAMOL', 'N02BE01'], ['DEXKETOPROFENE', 'M01AE17'], ['TRUCMUCHINE', null], ['', null]] as const) {
    const r = allergiesDeDci(dci, atc)
    assert.deepEqual([r.substance.length, r.classes.length], [0, 0], dci)
  }
})

test('corticoïdes : seuls les codes de corticoïdes, pas les anti-corticoïdes ni les associations sans corticoïde', () => {
  assert.deepEqual(codes(allergiesDeDci('PREDNISOLONE', 'H02AB06').classes), ['0040014'])
  assert.deepEqual(codes(allergiesDeDci('BETAMETHASONE', 'D07AC01').classes), ['0040014'])
  assert.deepEqual(codes(allergiesDeDci('TRILOSTANE', 'H02CA01').classes), [])
  assert.deepEqual(codes(allergiesDeDci('FENOTEROL + IPRATROPIUM', 'R03AL01').classes), [])
})

test('excipients : listés pour la fiche, non évaluables (aucun rattachement)', () => {
  const r = allergiesDeDci('AMOXICILLINE', 'J01CA04')
  assert.equal(r.excipients.length, 8)
  assert.ok(r.excipients.every(a => a.relation === 'aucun'))
})

test('filtre de recherche : une allergie de substance ne signale que cette substance', () => {
  const f = filtreAllergie('0040004')!
  assert.equal(f('AMOXICILLINE', 'J01CA04')?.via, 'amoxicilline')
  assert.ok(f('AMOXICILLINE + ACIDE CLAVULANIQUE', 'J01CR02'))
  assert.equal(f('AMPICILLINE', 'J01CA01'), null) // autre pénicilline : pas d'allergie croisée
  assert.equal(f('CEFTRIAXONE', 'J01DD04'), null)
})

test('filtre de recherche : une allergie de classe signale les membres de cette classe seulement', () => {
  const f = filtreAllergie('0060520')! // pénicillines
  assert.equal(f('AMPICILLINE', 'J01CA01')?.via, 'J01C')
  assert.equal(f('BENZYLPENICILLINE', 'J01CE01')?.relation, 'classe')
  assert.equal(f('CEFTRIAXONE', 'J01DD04'), null)
  assert.equal(f('PARACETAMOL', 'N02BE01'), null)
  assert.equal(f('PARACETAMOL', null), null)
})

test('filtre de recherche : excipients, racines et codes inconnus ne se filtrent pas', () => {
  assert.equal(filtreAllergie('4376'), null) // lait : excipient
  assert.equal(filtreAllergie('0060500'), null)
  assert.equal(filtreAllergie('nimporte'), null)
})

test('page allergie : DCI concernées parmi les lignes de la nomenclature', () => {
  const a = allergieParCode('DOID:0060520')!
  const lignes = [
    { dci: 'AMOXICILLINE', code_atc: 'J01CA04', n: 40 }, { dci: 'AMPICILLINE', code_atc: 'J01CA01', n: 5 },
    { dci: 'CEFIXIME', code_atc: 'J01DD08', n: 9 }, { dci: 'PARACETAMOL', code_atc: 'N02BE01', n: 80 },
  ]
  assert.deepEqual(dcisConcernees(a, lignes).map(d => d.dci), ['AMOXICILLINE', 'AMPICILLINE'])
  assert.equal(nomAgent(a), 'pénicillines')
})
