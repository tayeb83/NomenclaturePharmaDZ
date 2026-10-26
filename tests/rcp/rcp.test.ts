/**
 * RCP de l'ANPP rattachés aux fiches : liens, faits relus, interrupteurs d'urgence.
 *   node --test tests/rcp/
 * Les tests d'accès à la base tournent seulement avec TEST_DATABASE_URL
 * (base de TEST ; sql/26 et sql/27 sont appliqués ici, les tables rcp_* y sont vidées) :
 *   TEST_DATABASE_URL=postgresql://dwa:dwa@localhost:5432/dwa_test node --test tests/rcp/
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { fetchRcpForFiche, isOfficialRcpUrl, pdfPageUrl, sortFaits, type QueryFn, type RcpFait } from '../../lib/rcp-core.ts'

const PORTAL = 'https://rcp.anpp.dz/storage/rcp-pdfs/biopharm-spa/6aa32dae-306d-4feb-85a1-fa181acf992f.pdf'

test('seules les adresses https du portail ANPP deviennent des liens', () => {
  assert.equal(isOfficialRcpUrl(PORTAL), true)
  for (const bad of [
    'http://rcp.anpp.dz/x.pdf', 'https://rcp.anpp.dz.evil.example/x.pdf', 'https://evil.example/rcp.anpp.dz/x.pdf',
    'https://user@evil.example/x.pdf', 'javascript:alert(1)', 'data:application/pdf;base64,AAAA', '/storage/x.pdf', '', null, undefined,
  ]) {
    assert.equal(isOfficialRcpUrl(bad as string), false, String(bad))
  }
})

test('lien vers une page précise du PDF', () => {
  assert.equal(pdfPageUrl(PORTAL, 3), `${PORTAL}#page=3`)
  assert.equal(pdfPageUrl(PORTAL, 0), PORTAL)
  assert.equal(pdfPageUrl(PORTAL, 2.5), PORTAL)
})

const fait = (o: Partial<RcpFait>): RcpFait => ({
  id: 1, type: 'interaction', section: '4.3', page: 3, libelle: 'X', gravite: null, cible_type: null, cible: null, population: null, ...o,
})

test('tri : doses, contre-indications, grossesse, interactions', () => {
  const sorted = sortFaits([
    fait({ id: 1, type: 'interaction', libelle: 'Alcool', gravite: 'contre_indiquee' }),
    fait({ id: 2, type: 'grossesse', libelle: 'Allaitement', gravite: 'contre_indiquee' }),
    fait({ id: 3, type: 'grossesse', libelle: 'Grossesse', gravite: 'contre_indiquee' }),
    fait({ id: 5, type: 'contre_indication', libelle: 'Hyperlipidémie' }),
    fait({ id: 4, type: 'contre_indication', libelle: 'Insuffisance hépatique sévère' }),
    fait({ id: 6, type: 'dose', libelle: '25 mg par jour', population: 'adulte' }),
  ])
  assert.deepEqual(sorted.map(f => f.id), [6, 4, 5, 3, 2, 1])
})

test('tri : doses avant interactions, adulte avant enfant, plus grave d\'abord', () => {
  const sorted = sortFaits([
    fait({ id: 1, libelle: 'Zinc', gravite: 'precaution' }),
    fait({ id: 2, libelle: 'Alcool', gravite: 'contre_indiquee' }),
    fait({ id: 3, type: 'dose', libelle: '0,5 mg/kg par jour', population: 'enfant' }),
    fait({ id: 4, type: 'dose', libelle: '25 mg par jour', population: 'adulte' }),
  ])
  assert.deepEqual(sorted.map(f => f.id), [4, 3, 2, 1])
})

test('une fiche sans numéro d\'enregistrement n\'interroge pas la base', async () => {
  const run: QueryFn = async () => { throw new Error('ne doit pas être appelée') }
  assert.deepEqual(await fetchRcpForFiche(run, null, 'C1'), [])
})

test('une adresse hors portail présente en base n\'est pas affichée', async () => {
  const run: QueryFn = async <T>(sql: string) => (sql.includes('to_regclass') ? [{ ok: false }] : [
    { rcp_id: 'a', pdf_url: 'https://evil.example/x.pdf' },
    { rcp_id: 'b', pdf_url: PORTAL },
  ]) as T[]
  assert.deepEqual((await fetchRcpForFiche(run, '001/A', 'C1')).map(r => r.rcp_id), ['b'])
})

test('avant sql/27 : liens comme avant, aucun fait, requête sans colonne faits_masques', async () => {
  const seen: string[] = []
  const run: QueryFn = async <T>(sql: string) => {
    seen.push(sql)
    return (sql.includes('to_regclass') ? [{ ok: false }] : [{ rcp_id: 'b', pdf_url: PORTAL }]) as T[]
  }
  const out = await fetchRcpForFiche(run, '001/A', 'C1')
  assert.equal(out.length, 1)
  assert.deepEqual(out[0].faits, [])
  assert.ok(!seen.some(s => s.includes('faits_masques') || s.includes('rcp_faits WHERE')))
})

const URL_DB = process.env.TEST_DATABASE_URL
const skip = URL_DB ? false : 'TEST_DATABASE_URL non défini'
let pool: pg.Pool
const run: QueryFn = async <T>(sql: string, params?: unknown[]) => (await pool.query(sql, params as any[])).rows as T[]
const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const one = async (sql: string, ...p: unknown[]) => (await pool.query(sql, p)).rows

before(async () => {
  if (!URL_DB) return
  process.env.DATABASE_URL = URL_DB
  pool = new pg.Pool({ connectionString: URL_DB })
  for (const f of ['26_rcp_anpp.sql', '27_rcp_faits.sql']) await pool.query(readFileSync(new URL(`../../sql/${f}`, import.meta.url), 'utf8'))
})
after(async () => { await pool?.end() })

beforeEach(async () => {
  if (!URL_DB) return
  await pool.query('TRUNCATE rcp_documents, rcp_fiches, rcp_dci, rcp_faits CASCADE')
  await pool.query(`UPDATE rcp_reglages SET actif = TRUE`)
  const docs: [number, string, boolean][] = [[1, 'ATOSTINE', false], [2, 'ATOSTINE 20', false], [3, 'ANCIEN', true], [4, 'DOUTEUX', false]]
  for (const [n, nom, retire] of docs) {
    await pool.query(
      'INSERT INTO rcp_documents (rcp_id, nom_commercial, pdf_url, retire, laboratoire_anpp, version_texte) VALUES ($1, $2, $3, $4, $5, $6)',
      [ID(n), nom, `https://rcp.anpp.dz/storage/rcp-pdfs/x/${ID(n)}.pdf`, retire, 'LDM', '12/2025'],
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

async function addFait(n: number, o: { type?: string; libelle: string; status?: string; gravite?: string; population?: string; cle?: string }) {
  await pool.query(
    `INSERT INTO rcp_faits (rcp_id, type, section, page, libelle, gravite, population, cle, status, reviewed_by)
     VALUES ($1, $2, '4.3', 3, $3, $4, $5, $6, $7, $8)`,
    [ID(n), o.type ?? 'interaction', o.libelle, o.gravite ?? null, o.population ?? null, o.cle ?? o.libelle,
     o.status ?? 'publie', (o.status ?? 'publie') === 'publie' ? 'Dr X' : null],
  )
}

test('la fiche affiche auto et confirmé, pas probable, rejeté ni retiré', { skip }, async () => {
  const out = await fetchRcpForFiche(run, '001/A', 'C1')
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

test('seuls les faits publiés s\'affichent, triés, sur le bon RCP', { skip }, async () => {
  await addFait(1, { libelle: 'Alcool', gravite: 'precaution' })
  await addFait(1, { libelle: 'Méthotrexate', gravite: 'contre_indiquee' })
  await addFait(1, { type: 'dose', libelle: '25–30 mg par jour', population: 'adulte' })
  await addFait(1, { libelle: 'Brouillon', status: 'brouillon' })
  await addFait(1, { libelle: 'Rejeté', status: 'rejete' })
  await addFait(2, { libelle: 'Autre RCP', gravite: 'deconseillee' })
  const out = await fetchRcpForFiche(run, '001/A', 'C1')
  const by = Object.fromEntries(out.map(r => [r.nom_commercial, r.faits.map(f => f.libelle)]))
  assert.deepEqual(by['ATOSTINE'], ['25–30 mg par jour', 'Méthotrexate', 'Alcool'])
  assert.deepEqual(by['ATOSTINE 20'], ['Autre RCP'])
})

test('interrupteur « faits » : le lien reste, les faits disparaissent', { skip }, async () => {
  await addFait(1, { libelle: 'Alcool' })
  await pool.query(`UPDATE rcp_reglages SET actif = FALSE WHERE cle = 'faits'`)
  const out = await fetchRcpForFiche(run, '001/A', 'C2')
  assert.equal(out.length, 1)
  assert.deepEqual(out[0].faits, [])
})

test('interrupteur « liens » : plus rien ne s\'affiche', { skip }, async () => {
  await addFait(1, { libelle: 'Alcool' })
  await pool.query(`UPDATE rcp_reglages SET actif = FALSE WHERE cle = 'liens'`)
  assert.deepEqual(await fetchRcpForFiche(run, '001/A', 'C1'), [])
})

test('masquer les faits d\'un document ne touche pas les autres', { skip }, async () => {
  await addFait(1, { libelle: 'Alcool' })
  await addFait(2, { libelle: 'Vitamine A' })
  await pool.query(`UPDATE rcp_documents SET faits_masques = TRUE WHERE rcp_id = $1`, [ID(1)])
  const out = await fetchRcpForFiche(run, '001/A', 'C1')
  const by = Object.fromEntries(out.map(r => [r.nom_commercial, r.faits.length]))
  assert.deepEqual(by, { 'ATOSTINE': 0, 'ATOSTINE 20': 1 })
})

// ─── Administration ───────────────────────────────────────────

test('admin : publier exige un relecteur, corriger le libellé est borné', { skip }, async () => {
  const admin = await import('../../lib/rcp-admin.ts')
  await addFait(1, { libelle: 'Alcool', status: 'brouillon' })
  const [{ id }] = await one('SELECT id FROM rcp_faits')
  await assert.rejects(admin.updateFait(id, { status: 'publie' }), /relecteur/)
  await assert.rejects(admin.updateFait(id, { status: 'publie', reviewed_by: '   ' }), /relecteur/)
  await assert.rejects(admin.updateFait(id, { libelle: '' }), /Libellé invalide/)
  await assert.rejects(admin.updateFait(id, { libelle: 'x'.repeat(141) }), /Libellé invalide/)
  await assert.rejects(admin.updateFait(id, { status: 'nimporte' }), /Statut invalide/)
  await admin.updateFait(id, { libelle: '  Alcool\n(boissons) ', status: 'publie', reviewed_by: 'Dr Merabti' })
  const [row] = await one('SELECT libelle, status, reviewed_by, reviewed_at FROM rcp_faits')
  assert.equal(row.libelle, 'Alcool (boissons)')
  assert.equal(row.status, 'publie')
  assert.equal(row.reviewed_by, 'Dr Merabti')
  assert.ok(row.reviewed_at)
  await admin.updateFait(id, { status: 'brouillon' })  // dépublier efface le relecteur
  assert.deepEqual((await one('SELECT status, reviewed_by FROM rcp_faits'))[0], { status: 'brouillon', reviewed_by: null })
})

test('admin : publier tous les brouillons d\'un RCP seulement', { skip }, async () => {
  const admin = await import('../../lib/rcp-admin.ts')
  await addFait(1, { libelle: 'A', status: 'brouillon' })
  await addFait(1, { libelle: 'B', status: 'brouillon' })
  await addFait(1, { libelle: 'C', status: 'rejete' })
  await addFait(2, { libelle: 'D', status: 'brouillon' })
  await assert.rejects(admin.publishDrafts(ID(1), ''), /relecteur/)
  assert.equal(await admin.publishDrafts(ID(1), 'Dr X'), 2)
  assert.deepEqual((await one(`SELECT libelle, status FROM rcp_faits ORDER BY libelle`)).map(r => `${r.libelle}:${r.status}`),
    ['A:publie', 'B:publie', 'C:rejete', 'D:brouillon'])
})

test('admin : retrait par laboratoire, puis rétablissement', { skip }, async () => {
  const admin = await import('../../lib/rcp-admin.ts')
  await pool.query(`UPDATE rcp_documents SET laboratoire_anpp = 'AUTRE' WHERE rcp_id = $1`, [ID(2)])
  await addFait(1, { libelle: 'Alcool' })
  assert.equal(await admin.setLaboratoireFlags('LDM', { faits_masques: true }), 3)
  assert.deepEqual((await fetchRcpForFiche(run, '001/A', 'C1')).map(r => [r.nom_commercial, r.faits.length]), [['ATOSTINE 20', 0], ['ATOSTINE', 0]])
  assert.equal(await admin.setLaboratoireFlags('LDM', { retire: true }), 3)
  assert.deepEqual((await fetchRcpForFiche(run, '001/A', 'C1')).map(r => r.nom_commercial), ['ATOSTINE 20'])
  assert.equal(await admin.setLaboratoireFlags('LDM', { retire: false, faits_masques: false }), 3)
  // rétablir un laboratoire remet aussi ANCIEN (retiré à part dans le jeu de test) : le rétablissement vaut pour tout le laboratoire
  assert.equal((await fetchRcpForFiche(run, '001/A', 'C1')).length, 3)
  await assert.rejects(admin.setLaboratoireFlags('LDM', {}), /Rien à modifier/)
  await assert.rejects(admin.setLaboratoireFlags('  ', { retire: true }), /Laboratoire manquant/)
})

test('admin : interrupteurs et liste des documents', { skip }, async () => {
  const admin = await import('../../lib/rcp-admin.ts')
  await addFait(1, { libelle: 'A', status: 'brouillon' })
  await addFait(1, { libelle: 'B' })
  await admin.setReglage('faits', false)
  assert.deepEqual(await admin.getReglagesAdmin(), { liens: true, faits: false })
  const docs = await admin.listDocuments(true)
  const d = docs.find(x => x.rcp_id === ID(1))!
  assert.deepEqual([d.nb_brouillon, d.nb_publie, d.nb_fiches], [1, 1, 2])
  assert.equal(admin.isUuid('pas-un-uuid'), false)
})

test('sql/27 se rejoue sur une table créée avant les contre-indications et la grossesse', { skip }, async () => {
  await pool.query(`ALTER TABLE rcp_faits DROP CONSTRAINT rcp_faits_type_check`)
  await pool.query(`ALTER TABLE rcp_faits ADD CONSTRAINT rcp_faits_type_check CHECK (type IN ('dose', 'interaction'))`)
  await assert.rejects(addFait(1, { type: 'grossesse', libelle: 'Grossesse', status: 'brouillon' }))
  await pool.query(readFileSync(new URL('../../sql/27_rcp_faits.sql', import.meta.url), 'utf8'))
  await addFait(1, { type: 'contre_indication', libelle: 'Hyperlipidémie', status: 'brouillon' })
  await addFait(1, { type: 'grossesse', libelle: 'Grossesse', gravite: 'contre_indiquee', status: 'brouillon' })
  assert.equal((await one('SELECT count(*)::int AS n FROM rcp_faits'))[0].n, 2)
  await assert.rejects(addFait(1, { type: 'inconnu', libelle: 'X', status: 'brouillon' }))
})

test('les contre-indications et la grossesse publiées s\'affichent avec les autres faits', { skip }, async () => {
  await addFait(1, { type: 'contre_indication', libelle: 'Hyperlipidémie' })
  await addFait(1, { type: 'grossesse', libelle: 'Grossesse', gravite: 'contre_indiquee' })
  await addFait(1, { type: 'contre_indication', libelle: 'Non relu', status: 'brouillon' })
  const out = await fetchRcpForFiche(run, '001/A', 'C2')
  assert.deepEqual(out[0].faits.map(f => [f.type, f.libelle]), [['contre_indication', 'Hyperlipidémie'], ['grossesse', 'Grossesse']])
})
