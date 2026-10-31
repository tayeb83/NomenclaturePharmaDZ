/**
 * Arabisation des noms de médicaments et clé de recherche par squelette consonantique.
 *   npm run test:search
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arabizeName, displayName } from '../../lib/arabize.ts'
import { foldSkeleton } from '../../lib/search-normalize.ts'

test('DCI et marques connues', () => {
  assert.equal(arabizeName('PARACETAMOL'), 'باراسيتامول')
  assert.equal(arabizeName('Paracétamol'), 'باراسيتامول')
  assert.equal(arabizeName('MAXIPLAZ'), 'ماكسيبلاز')
  assert.equal(arabizeName('AMOXICILLINE'), 'أموكسيسيلين')
  assert.equal(arabizeName('DOLIPRANE'), 'دوليبران')
})

test('dosages et unités conservés', () => {
  assert.equal(arabizeName('DOLIPRANE 500 MG'), 'دوليبران 500 MG')
})

test('affichage selon la langue : arabe puis original entre parenthèses', () => {
  assert.equal(displayName('MAXIPLAZ', 'fr'), 'MAXIPLAZ')
  assert.equal(displayName('MAXIPLAZ', 'ar'), 'ماكسيبلاز (MAXIPLAZ)')
  assert.equal(displayName(null, 'ar'), '')
})

test('le squelette rapproche la saisie arabe du nom latin', () => {
  assert.equal(foldSkeleton('باراسيتامول'), foldSkeleton('PARACETAMOL'))
  assert.equal(foldSkeleton('ماكسيبلاز'), foldSkeleton('MAXIPLAZ'))
  assert.equal(foldSkeleton('دوليبران'), foldSkeleton('doliprane'))
  assert.notEqual(foldSkeleton('ماكسيبلاز'), foldSkeleton('doliprane'))
})

import { displayField } from '../../lib/translate-fields.ts'

test('propriétés de la fiche : traduction sûre, sinon valeur d\'origine', () => {
  assert.equal(displayField('forme', 'COMPRIME', 'ar'), 'قرص (COMPRIME)')
  assert.equal(displayField('dosage', '2,5MG', 'ar'), '2,5 ملغ (2,5MG)')
  assert.equal(displayField('conditionnement', 'B/20', 'ar'), 'علبة من 20 (B/20)')
  assert.equal(displayField('liste', 'LISTE I', 'ar'), 'القائمة I (LISTE I)')
  assert.equal(displayField('prescription', 'HOP', 'ar'), 'للاستعمال الاستشفائي (HOP)')
  assert.equal(displayField('stabilite', '24 MOIS', 'ar'), '24 شهرا (24 MOIS)')
  assert.equal(displayField('stabilite', '3 ANS', 'ar'), '3 سنوات (3 ANS)')
  assert.equal(displayField('forme', 'FORME INCONNUE', 'ar'), 'FORME INCONNUE')
  assert.equal(displayField('dosage', '2,5MG', 'fr'), '2,5MG')
})
