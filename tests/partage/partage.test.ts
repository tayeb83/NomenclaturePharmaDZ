/** Partage d'une fiche médicament. node --test tests/partage/ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shareLinks, shareMessage } from '../../lib/medicament-share.ts'

const med = { nom_marque: 'DOLIPRANE', dci: 'PARACETAMOL', forme: 'comprimé', dosage: '1000 mg', labo: 'SANOFI' }

test('message : nom, substance, présentation et laboratoire', () => {
  const m = shareMessage(med, 'fr')
  assert.match(m, /DOLIPRANE \(PARACETAMOL\) — comprimé 1000 mg · SANOFI/)
  assert.match(m, /interactions médicamenteuses sur DwaDZ/)
  assert.match(shareMessage(med, 'ar'), /^💊 DOLIPRANE \(PARACETAMOL\)/)
})

test('message : pas de doublon quand la marque est la substance, pas de tiret orphelin', () => {
  assert.match(shareMessage({ nom_marque: 'PARACETAMOL', dci: 'paracetamol' }, 'fr'), /^💊 PARACETAMOL\nLa fiche/)
})

test('liens : adresse encodée, sans espace ni caractère dangereux', () => {
  const url = 'https://www.dzair-pharma.net/medicament/enregistrement/1/doliprane?x=1&y=2'
  const l = shareLinks(url, 'Bonjour & bienvenue\nligne 2')
  assert.ok(l.facebook.startsWith('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2F'))
  assert.ok(l.x.startsWith('https://twitter.com/intent/tweet?text='))
  assert.ok(l.x.includes('&url=https%3A%2F%2F'))
  assert.ok(l.whatsapp.startsWith('https://wa.me/?text='))
  for (const href of Object.values(l)) assert.doesNotMatch(href, /[\s"<>]/)
  assert.equal(new URL(l.x).searchParams.get('url'), url)
  assert.equal(new URL(l.whatsapp).searchParams.get('text'), `Bonjour & bienvenue\nligne 2\n${url}`)
})

test('X : le texte est raccourci proprement avec une marge pour l\'adresse', () => {
  const long = 'mot '.repeat(100)
  const t = new URL(shareLinks('https://a.b/c', long).x).searchParams.get('text')!
  assert.ok(t.length <= 230)
  assert.ok(t.endsWith('…'))
})
