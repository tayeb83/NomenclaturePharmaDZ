/**
 * Charge le référentiel terminologique en base et relie chaque fiche à l'EDQM et à l'UCUM.
 * Prérequis : psql "$DATABASE_URL" -f sql/39_terminologies.sql
 *
 *   DATABASE_URL=... npx tsx scripts/sync_terminologies.mts            # simulation : rien n'est écrit
 *   DATABASE_URL=... npx tsx scripts/sync_terminologies.mts --apply    # écrit en base
 *
 * À relancer après une mise à jour de lib/edqm-data.ts, de lib/edqm-ar.ts ou des règles de lib/guide-core.ts.
 * Un import de nomenclature depuis l'admin la relance tout seul.
 * Les lignes de forme_edqm_mapping passées en source = 'manual' et les traductions arabes marquées « relu »
 * en base sont conservées.
 */
import { synchroniserTerminologies } from '../lib/terminologies.ts'
import { getPool } from '../lib/db.ts'

const apply = process.argv.includes('--apply')
try {
  const b = await synchroniserTerminologies({ apply })
  if (!b) { console.error('Tables absentes : appliquez d’abord sql/39_terminologies.sql'); process.exitCode = 1 }
  else {
    const pct = (n: number) => (b.fiches ? ` (${Math.round((1000 * n) / b.fiches) / 10} %)` : '')
    console.log(`${apply ? 'ÉCRIT' : 'SIMULATION (ajoutez --apply pour écrire)'}`)
    console.log(`Termes EDQM                      ${b.termes_edqm}`)
    console.log(`Unités UCUM                      ${b.unites_ucum}`)
    console.log(`Écritures de forme reliées       ${b.formes}, dont ${b.formes_manuelles} corrigées à la main`)
    console.log(`Fiches                           ${b.fiches}`)
    console.log(`  avec forme EDQM                ${b.fiches_forme_edqm}${pct(b.fiches_forme_edqm)}`)
    console.log(`  avec voie EDQM                 ${b.fiches_voie_edqm}${pct(b.fiches_voie_edqm)}`)
    console.log(`  avec unité UCUM                ${b.fiches_ucum}${pct(b.fiches_ucum)}`)
  }
} finally {
  await getPool().end()
}
