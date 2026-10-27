/**
 * DwaDZ — visuel de partage d'une fiche médicament (1200×630, format Facebook / X / WhatsApp).
 * Même style Casbah que les visuels de garde : marine, laiton, zellige.
 * Servi par app/partage/medicament/[source]/[id] (hors /api : les robots d'aperçu y sont admis,
 * voir middleware.ts).
 */
import { ImageResponse } from 'next/og'
import type { MedicamentDetail } from '@/lib/db-types'
import { CASBAH, bandUri, ornamentRuleUri, starUri } from '@/lib/garde-ornaments'
import { imageChrome } from '@/lib/garde-social'
import { formatPpa } from '@/lib/ppa'
import type { Lang } from '@/lib/i18n'

const W = 1200
const H = 630
const PAD = 56

export type ShareStats = {
  ppa: number | null
  interactions: number
  contreIndications: number
}

const coupe = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s)

export function shareStatusLabel(med: Pick<MedicamentDetail, 'source'>, lang: Lang): string {
  if (med.source === 'retrait') return lang === 'ar' ? 'دواء مسحوب' : 'Médicament retiré'
  if (med.source === 'non_renouvele') return lang === 'ar' ? 'AMM غير مجددة' : 'AMM non renouvelée'
  return lang === 'ar' ? 'دواء مسجل في الجزائر' : 'Enregistré en Algérie'
}

function chips(stats: ShareStats, lang: Lang): string[] {
  const ar = lang === 'ar'
  const out: string[] = []
  if (stats.ppa != null) out.push(`${ar ? 'الثمن' : 'PPA'} : ${formatPpa(stats.ppa, lang)}`)
  if (stats.interactions > 0) {
    // une puce par chiffre : mêler arabe et nombres dans un même texte brouille l'ordre de lecture
    out.push(ar
      ? `تداخلات دوائية : ${stats.interactions}`
      : `${stats.interactions} interaction${stats.interactions > 1 ? 's' : ''} médicamenteuse${stats.interactions > 1 ? 's' : ''}`)
    if (stats.contreIndications) {
      out.push(ar
        ? `ممنوعة : ${stats.contreIndications}`
        : `${stats.contreIndications} contre-indiquée${stats.contreIndications > 1 ? 's' : ''}`)
    }
  }
  return out
}

export async function buildMedicamentShareImage(med: MedicamentDetail, stats: ShareStats, lang: Lang) {
  const chrome = await imageChrome(lang)
  const { ar, fonts, logo, rowDir, displayFamily, appHost } = chrome
  // satori écarte trop les mots arabes : l'espace insécable garde le texte en un seul segment
  const nb = (s: string) => (ar ? s.replace(/ /g, ' ') : s)

  const titre = coupe(med.nom_marque, 34)
  const taille = titre.length > 24 ? 66 : titre.length > 16 ? 82 : 96
  const dci = coupe(med.dci || '', 60)
  const presentation = coupe([med.forme, med.dosage].filter(Boolean).join(' · '), 64)
  const labo = coupe([med.labo, med.pays].filter(Boolean).join(' — '), 64)
  const puces = chips(stats, lang)
  const actif = med.source === 'enregistrement'
  const accroche = ar
    ? ['المادة الفعالة', 'الأدوية الجنيسة', 'الثمن', 'التداخلات']
    : ['Substance active', 'Génériques', 'Prix', 'Interactions']

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: CASBAH.navyDeep, fontFamily: chrome.fontFamily, position: 'relative',
      }}>
        <img src={bandUri(W, 26)} width={W} height={26} alt="" />

        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: `22px ${PAD}px 0`, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center' }}>
              {logo && <img src={logo} width={46} height={46} alt="" style={ar ? { marginLeft: 12 } : { marginRight: 12 }} />}
              <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: 40, fontWeight: 700, color: CASBAH.brassLight }}>DwaDZ</div>
            </div>
            <div style={{
              display: 'flex', fontSize: 22, fontWeight: 700, lineHeight: 1.3, padding: '4px 20px', borderRadius: 999,
              color: actif ? CASBAH.navy : '#fff7e0',
              backgroundColor: actif ? CASBAH.brassLight : CASBAH.brassDark,
              border: `2px solid ${CASBAH.brass}`,
            }}>
              {nb(shareStatusLabel(med, lang))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
            {dci && (
              <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', marginBottom: 6 }}>
                <img src={starUri(CASBAH.brass)} width={22} height={22} alt="" style={ar ? { marginLeft: 12 } : { marginRight: 12 }} />
                <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: CASBAH.brassLight, letterSpacing: 1 }}>{dci}</div>
              </div>
            )}
            <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: taille, lineHeight: 1.05, fontWeight: 700, color: '#fff7e0', textAlign: 'center' }}>
              {titre}
            </div>
            {presentation && (
              <div style={{ display: 'flex', fontSize: 36, color: '#dbe5f5', marginTop: 10 }}>{presentation}</div>
            )}
            {labo && <div style={{ display: 'flex', fontSize: 26, color: '#a9b8d4', marginTop: 6 }}>{nb(labo)}</div>}

            {puces.length > 0 && (
              <div style={{ display: 'flex', flexDirection: rowDir, marginTop: 24 }}>
                {puces.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', fontSize: 26, fontWeight: 700, color: CASBAH.ink, backgroundColor: CASBAH.cream,
                    border: `2px solid ${CASBAH.brass}`, borderRadius: 12, padding: '6px 20px', lineHeight: 1.3,
                    ...(i > 0 ? (ar ? { marginRight: 16 } : { marginLeft: 16 }) : {}),
                  }}>
                    {nb(p)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 14 }}>
            <img src={ornamentRuleUri(W - PAD * 2, CASBAH.brass, 6, 0.55)} width={W - PAD * 2} height={14} alt="" />
            <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
              <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', fontSize: 22, color: '#c9d6ea' }}>
                {accroche.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    {i > 0 && <img src={starUri(CASBAH.brass)} width={12} height={12} alt="" style={{ margin: '0 12px' }} />}
                    {nb(m)}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: 30, fontWeight: 700, color: CASBAH.brassLight }}>{appHost}</div>
            </div>
          </div>
        </div>

        <img src={bandUri(W, 26)} width={W} height={26} alt="" />
      </div>
    ),
    { width: W, height: H, ...(fonts ? { fonts } : {}) }
  )
}
