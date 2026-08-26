#!/usr/bin/env node
/**
 * Prépare le couple FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN attendu
 * par l'application, à partir d'un jeton généré dans les Outils Graph API.
 *
 * Le script accepte les deux natures de jeton :
 *  - **jeton utilisateur** (le cas courant) : il l'échange contre un jeton
 *    utilisateur longue durée (60 j), puis lit /me/accounts pour en dériver
 *    le jeton de Page — lequel n'expire pas tant que le compte laisse
 *    l'application autorisée ;
 *  - **jeton de Page** (déjà le bon type) : il lit /me pour retrouver
 *    l'identifiant de la Page et vérifie que le jeton est bien permanent.
 *
 * Usage :
 *   node scripts/facebook_page_token.mjs <jeton> [app_id] [app_secret]
 * avec FACEBOOK_APP_ID / FACEBOOK_APP_SECRET dans l'environnement si les
 * deux derniers arguments sont omis.
 *
 * Pour obtenir le jeton de départ : https://developers.facebook.com/tools/explorer
 * → choisir l'application, « Jeton d'accès utilisateur », autorisations
 * pages_show_list, pages_manage_posts, pages_read_engagement → Générer.
 *
 * Aucune donnée n'est envoyée ailleurs que vers graph.facebook.com.
 */

const GRAPH = process.env.FACEBOOK_GRAPH_API_BASE || 'https://graph.facebook.com/v18.0'
const REQUIRED_SCOPES = ['pages_manage_posts', 'pages_read_engagement']

const [inputToken, argAppId, argAppSecret] = process.argv.slice(2)
const appId = argAppId || process.env.FACEBOOK_APP_ID
const appSecret = argAppSecret || process.env.FACEBOOK_APP_SECRET

function die(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

if (!inputToken) {
  die('Usage : node scripts/facebook_page_token.mjs <jeton> [app_id] [app_secret]')
}
if (!appId || !appSecret) {
  die('FACEBOOK_APP_ID et FACEBOOK_APP_SECRET sont requis (variables d’environnement ou arguments 2 et 3).')
}

async function graph(path, params) {
  const url = new URL(`${GRAPH}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    const e = data.error || {}
    const codes = [e.code != null ? `code ${e.code}` : null, e.error_subcode != null ? `sous-code ${e.error_subcode}` : null]
      .filter(Boolean).join(', ')
    die(`Graph ${path} : ${e.message || `HTTP ${res.status}`}${codes ? ` (${codes})` : ''}`)
  }
  return data
}

const mask = (t) => `${t.slice(0, 12)}…${t.slice(-6)} (${t.length} caractères)`
const stamp = (ts) => (ts ? new Date(ts * 1000).toLocaleString('fr-FR') : 'jamais')

async function inspect(token) {
  const { data } = await graph('debug_token', { input_token: token, access_token: `${appId}|${appSecret}` })
  return data || {}
}

/** L'accès aux données expire 90 j après la dernière autorisation, même sur un jeton « permanent ». */
function warnDataAccess(info) {
  const at = info.data_access_expires_at
  if (at && at * 1000 > Date.now()) {
    console.log(`   ⚠️  Accès aux données jusqu’au ${stamp(at)} : passé cette date, l’API répond code 190 / sous-code 493`)
    console.log('      et il faut repasser par l’explorateur Graph pour ré-autoriser l’application.')
  }
}

// ─── 1. Nature du jeton fourni ───────────────────────────────────────────────
const d = await inspect(inputToken)
console.log(`\n🔎 Jeton fourni : type ${d.type}, application ${d.application || d.app_id}, valide : ${d.is_valid}`)
if (d.is_valid === false) {
  die(`Jeton déjà invalide : ${d.error?.message || 'raison non précisée'}. Regénérez-en un dans les Outils Graph API.`)
}
if (String(d.app_id) !== String(appId)) {
  die(`Le jeton a été émis par l’application ${d.app_id}, pas ${appId}. Sélectionnez la bonne application dans l’explorateur Graph.`)
}
const missing = REQUIRED_SCOPES.filter((s) => !(d.scopes || []).includes(s))
if (missing.length) {
  die(`Autorisations manquantes sur ce jeton : ${missing.join(', ')}. Régénérez-le en les cochant.`)
}

// ─── 2a. Jeton de Page : il ne reste qu'à retrouver l'identifiant ────────────
if (d.type === 'PAGE') {
  const page = await graph('me', { fields: 'id,name,tasks', access_token: inputToken })
  const canPost = Array.isArray(page.tasks) ? page.tasks.includes('CREATE_CONTENT') : true

  console.log('\n✅ C’est déjà un jeton de Page — rien à échanger.\n')
  console.log(`── ${page.name} ──`)
  console.log(`   FACEBOOK_PAGE_ID=${page.id}`)
  console.log(`   FACEBOOK_PAGE_ACCESS_TOKEN=${inputToken}`)
  console.log(`   publication autorisée : ${canPost ? 'oui' : 'NON (tâche « Contenu » manquante sur la Page)'}`)
  console.log(`   expiration : ${stamp(d.expires_at)}`)
  warnDataAccess(d)

  if (d.expires_at) {
    console.log('\n⚠️  Ce jeton de Page EXPIRE : il dérive d’un jeton utilisateur de courte durée.')
    console.log('   Pour en obtenir un permanent, relancez ce script avec un *jeton utilisateur* :')
    console.log('   explorateur Graph → « Jeton d’accès utilisateur » (et non « Jeton d’accès de Page »)')
    console.log('   → autorisations pages_show_list, pages_manage_posts, pages_read_engagement → Générer.')
  }

  console.log('\n👉 Copiez ce couple dans les variables d’environnement, puis redéployez.')
  console.log('   Vérifiez ensuite avec « Vérifier la configuration » sur /admin/social.\n')
  process.exit(0)
}

if (d.type !== 'USER') {
  die(`Type de jeton inattendu (${d.type}) : fournissez un jeton utilisateur ou un jeton de Page.`)
}

// ─── 2b. Jeton utilisateur : échange longue durée puis dérivation ────────────
if (!(d.scopes || []).includes('pages_show_list')) {
  die('Autorisation pages_show_list manquante : sans elle, /me/accounts ne renvoie aucune Page. Régénérez le jeton en la cochant.')
}

const longLived = await graph('oauth/access_token', {
  grant_type: 'fb_exchange_token',
  client_id: appId,
  client_secret: appSecret,
  fb_exchange_token: inputToken,
})
console.log(`✅ Jeton utilisateur longue durée obtenu : ${mask(longLived.access_token)}`)

const accounts = await graph('me/accounts', {
  fields: 'id,name,tasks,access_token',
  limit: '100',
  access_token: longLived.access_token,
})
const pages = accounts.data || []
if (!pages.length) {
  die('Ce compte n’administre aucune Page (ou pages_show_list n’a pas été accordée, ou la Page n’a pas été cochée à la connexion).')
}

console.log(`\n📄 ${pages.length} Page(s) accessible(s) :\n`)
for (const p of pages) {
  const canPost = Array.isArray(p.tasks) ? p.tasks.includes('CREATE_CONTENT') : true
  const info = await inspect(p.access_token)
  console.log(`── ${p.name} ──`)
  console.log(`   FACEBOOK_PAGE_ID=${p.id}`)
  console.log(`   FACEBOOK_PAGE_ACCESS_TOKEN=${p.access_token}`)
  console.log(`   publication autorisée : ${canPost ? 'oui' : 'NON (tâche « Contenu » manquante sur la Page)'} — expiration : ${stamp(info.expires_at)}`)
  warnDataAccess(info)
  console.log('')
}

console.log('👉 Copiez le couple correspondant à votre Page dans les variables d’environnement, puis redéployez.')
console.log('   Vérifiez ensuite avec « Vérifier la configuration » sur /admin/social.\n')
