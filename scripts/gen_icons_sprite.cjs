// Régénère lib/dwadz-icons/sprite.ts à partir de lib/dwadz-icons/icons.svg
const fs = require('fs'), d = __dirname + '/../lib/dwadz-icons/'
const s = fs.readFileSync(d + 'icons.svg', 'utf8')
fs.writeFileSync(d + 'sprite.ts', '// Généré depuis icons.svg (node scripts/gen_icons_sprite.cjs) — ne pas éditer à la main.\nexport const SPRITE_ICONES = ' + JSON.stringify(s) + '\n')
