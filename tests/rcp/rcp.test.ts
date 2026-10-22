/**
 * RCP de l'ANPP rattachés aux fiches.
 *   node --test tests/rcp/
 * Les tests d'accès à la base tournent seulement avec TEST_DATABASE_URL
 * (base de TEST où sql/26 est appliqué ; les tables rcp_* y sont vidées) :
 *   TEST_DATABASE_URL=postgresql://dwa:dwa@localhost:5432/dwa_test node --test tests/rcp/
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { fetchRcpForFiche, isOfficialRcpUrl, type QueryFn } from '../../lib/rcp-core.ts'

const PORTAL = 'https://rcp.anpp.dz/storage/rcp-pdfs/biopharm-spa/6aa32dae-306d-4feb-85a1-fa181acf992f.pdf'

test('seules les adresses https du portail ANPP deviennent des liens', () => {
  assert.equal(isOfficialRcpUrl(PORTAL), true)
  for (const bad of [
    'http://rcp.anpp.dz/x.pdf',
    'https://rcp.anpp.dz.evil.example/x.pdf',
    'https://evil.example/rcp.anpp.dz/x.pdf',
    'https://user@evil.example/x.pdf',
    'javascript:alert(1)',
    'data:application/pdf;base64,AAAA',
    '/storage/x.pdf',
    '',
    null,
    undefined,
  ]) {
    assert.equal(isOfficialRcpUrl(bad as string), false, String(bad))
  }
})

test('une fiche sans numéro d\'enregistrement n\'interroge pas la base', async () => {
  const run: QueryFn = async () => { throw new Error('ne doit pas être appelée') }
  assert.deepEqual(await fetchRcpForFiche(run, null, 'C1'), [])
})

test('une adresse hors portail présente en base n\'est pas affichée', async () => {
  const run: QueryFn = async <T>() => [
    { rcp_id: 'a', pdf_url: 'https://evil.example/x.pdf' },
    { rcp_id: 'b', pdf_url: PORTAL },
  ] as T[]
  const out = await fetchRcpForFiche(run, '001/A', 'C1')
  assert.deepEqual(out.map(r => r.rcp_id), ['b'])
})

const URL_DB = process.env.TEST_DATABASE_URL
const skip = URL_DB ? false : 'TEST_DATABASE_URL non défini'
let pool: pg.Pool
const run: QueryFn = async <T>(sql: string, params?: unknown[]) => (await pool.query(sql, params as any[])).rows as T[]

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`

before(() => { if (URL_DB) pool = new pg.Pool({ connectionString: URL_DB }) })
after(async () => { await pool?.end() })
beforeEach(async () => {
  if (!URL_DB) return
  await pool.query('TRUNCATE rcp_documents, rcp_fiches, rcp_dci CASCADE')
  const docs: [number, string, boolean][] = [[1, 'ATOSTINE', false], [2, 'ATOSTINE 20', false], [3, 'ANCIEN', true], [4, 'DOUTEUX', false]]
  for (const [n, nom, retire] of docs) {
    await pool.query(
      'INSERT INTO rcp_documents (rcp_id, nom_commercial, pdf_url, retire) VALUES ($1, $2, $3, $4)',
      [ID(n), nom, `https://rcp.anpp.dz/storage/rcp-pdfs/x/${ID(n)}.pdf`, retire],
    )
  }
  const links: [number, string, string, string][] = [
    [1, '001/A', 'C1', 'auto'], [2, '001/A', 'C1', 'confirme'], [3, '001/A', 'C1', 'auto'],
    [4, '001/A', 'C1', 'probable'], [1, '001/A', 'C2', 'auto'], [2, '002/B', '', 'rejete'],
  ]
  for (const [n, nEnreg, code, statut] of links) {
    await pool.query('INSERT INTO rcp_fiches (rcp_id, n_enreg, code, statut) VALUES ($1, $2, $3, $4)', [ID(n), nEnreg, code, statut])
  }
})

test('la fiche affiche auto et confirmé, pas probable, rejeté ni retiré', { skip }, async () => {
  const out = await fetchRcpForFiche(run, '001/A', 'C1')
  // confirmé d'abord, puis par nom ; DOUTEUX (probable) et ANCIEN (retiré) absents
  assert.deepEqual(out.map(r => [r.nom_commercial, r.statut]), [['ATOSTINE 20', 'confirme'], ['ATOSTINE', 'auto']])
})

test('le rattachement tient compte du code (deux dosages, deux fiches)', { skip }, async () => {
  assert.deepEqual((await fetchRcpForFiche(run, '001/A', 'C2')).map(r => r.nom_commercial), ['ATOSTINE'])
  assert.deepEqual(await fetchRcpForFiche(run, '001/A', 'C3'), [])
})

test('code absent ou avec espaces : même clé que l\'import', { skip }, async () => {
  assert.deepEqual(await fetchRcpForFiche(run, '002/B', null), [])  // rejeté
  assert.deepEqual((await fetchRcpForFiche(run, '001/A', ' C2 ')).map(r => r.nom_commercial), ['ATOSTINE'])
})
