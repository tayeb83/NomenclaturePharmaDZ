#!/usr/bin/env node
/**
 * Génère le jeton de Page longue durée attendu par FACEBOOK_PAGE_ACCESS_TOKEN.
 *
 * Marche à suivre :
 *  1. https://developers.facebook.com/tools/explorer → choisir l'application,
 *     « User access token », autorisations pages_show_list, pages_manage_posts,
 *     pages_read_engagement → Generate Access Token (jeton court, ~1 h).
 *  2. node scripts/facebook_page_token.mjs <jeton-utilisateur-court>
 *     (avec FACEBOOK_APP_ID et FACEBOOK_APP_SECRET dans l'environnement, ou
 *     passés en 2e et 3e arguments).
 *
 * Le script échange le jeton court contre un jeton utilisateur longue durée
 * (60 j), puis lit /me/accounts : le jeton de Page qui en dérive n'expire pas
 * tant que le compte laisse l'application autorisée. C'est ce jeton-là — et
 * l'identifiant de Page affiché à côté — qu'il faut mettre dans les variables
 * d'environnement (Vercel : Settings › Environment Variables, puis redéployer).
 *
 * Aucune donnée n'est envoyée ailleurs que vers graph.facebook.com.
 */

const GRAPH = process.env.FACEBOOK_GRAPH_API_BASE || 'https://graph.facebook.com/v18.0'
const REQUIRED_SCOPES = ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement']

const [userToken, argAppId, argAppSecret] = process.argv.slice(2)
const appId = argAppId || process.env.FACEBOOK_APP_ID
const appSecret = argAppSecret || process.env.FACEBOOK_APP_SECRET

function die(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

if (!userToken) {
  die('Usage : node scripts/facebook_page_token.mjs <jeton-utilisateur> [app_id] [app_secret]')
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

// 1. Le jeton fourni est-il exploitable ?
const debug = await graph('debug_token', { input_token: userToken, access_token: `${appId}|${appSecret}` })
const d = debug.data || {}
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

// 2. Jeton utilisateur longue durée (60 jours)
const longLived = await graph('oauth/access_token', {
  grant_type: 'fb_exchange_token',
  client_id: appId,
  client_secret: appSecret,
  fb_exchange_token: userToken,
})
console.log(`✅ Jeton utilisateur longue durée obtenu : ${mask(longLived.access_token)}`)

// 3. Jetons de Page (sans expiration tant que l'app reste autorisée)
const accounts = await graph('me/accounts', {
  fields: 'id,name,tasks,access_token',
  limit: '100',
  access_token: longLived.access_token,
})
const pages = accounts.data || []
if (!pages.length) {
  die('Ce compte n’administre aucune Page (ou pages_show_list n’a pas été accordée).')
}

console.log(`\n📄 ${pages.length} Page(s) accessible(s) :\n`)
for (const p of pages) {
  const canPost = Array.isArray(p.tasks) ? p.tasks.includes('CREATE_CONTENT') : true
  const info = await graph('debug_token', { input_token: p.access_token, access_token: `${appId}|${appSecret}` })
  const expires = info.data?.expires_at ? new Date(info.data.expires_at * 1000).toISOString() : 'jamais'
  console.log(`── ${p.name} ──`)
  console.log(`   FACEBOOK_PAGE_ID=${p.id}`)
  console.log(`   FACEBOOK_PAGE_ACCESS_TOKEN=${p.access_token}`)
  console.log(`   publication autorisée : ${canPost ? 'oui' : 'NON (rôle Contenu manquant sur la Page)'} — expiration : ${expires}\n`)
}

console.log('👉 Copiez le couple correspondant à votre Page dans les variables d’environnement, puis redéployez.')
console.log('   Vérifiez ensuite avec « Vérifier la configuration » sur /admin/social.\n')
