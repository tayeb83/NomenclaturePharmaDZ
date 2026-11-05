/** Visuel de partage d'un article : découpe des lignes (arabe). node --test tests/partage/*.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lignes } from '../../lib/texte-lignes.ts'

test('lignes : coupe entre deux mots, au plus `max` caractères, et plafonne avec « … »', () => {
  assert.deepEqual(lignes('un deux trois quatre', 9), ['un deux', 'trois', 'quatre'])
  assert.deepEqual(lignes('court', 20), ['court'])
  const l = lignes('a b c d e f g h i j', 3, 2)
  assert.equal(l.length, 2)
  assert.ok(l[1].endsWith('…'))
  assert.ok(lignes('mot '.repeat(40).trim(), 12).every(x => x.length <= 12))
})
