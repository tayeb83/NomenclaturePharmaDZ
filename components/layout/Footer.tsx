'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/i18n/LanguageProvider'

export function Footer() {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <Image src="/dwadz-logo.svg" alt="Logo DwaDZ" width={120} height={48} className="footer-logo-image" />
              <span>DwaDZ</span>
            </div>
            <p className="footer-desc">
              {t(
                "DwaDZ… كلش على دوا البلاد. Moteur de recherche indépendant sur les données de la Nomenclature Nationale des Produits Pharmaceutiques, publiées par le Ministère de l'Industrie Pharmaceutique (MIPH). DwaDZ n'est pas le site officiel — il offre une interface de recherche fluide et avancée sur ces données.",
                'DwaDZ… كلش على دوا البلاد. محرك بحث مستقل على بيانات التسمية الوطنية للمستحضرات الصيدلانية الصادرة عن وزارة الصناعة الصيدلانية (MIPH). DwaDZ ليس الموقع الرسمي، بل يوفر واجهة بحث سلسة ومتقدمة على هذه البيانات.',
              )}
            </p>
            <div style={{ marginTop: 10, marginBottom: 4 }}>
              <a
                href="https://www.miph.gov.dz/fr/nomenclature-nationale-des-produits-pharmaceutiques/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'underline', wordBreak: 'break-all' }}
              >
                {t('Source officielle : miph.gov.dz', 'المصدر الرسمي: miph.gov.dz')}
              </a>
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="footer-badge">{t('DONNÉES SOURCE MIPH', 'بيانات من MIPH')}</span>
            </div>
          </div>

          <div className="footer-col">
            <h4>{t('Navigation', 'التنقل')}</h4>
            <ul className="footer-links">
              <li><Link href="/pharmacie-de-garde">{t('Pharmacies de garde', 'صيدليات المناوبة')}</Link></li>
              <li><Link href="/recherche">{t('Médicaments', 'الأدوية')}</Link></li>
              <li><Link href="/alertes">{t('Alertes', 'التنبيهات')}</Link></li>
              <li><Link href="/outils">{t('Outils & analyses', 'الأدوات والتحليلات')}</Link></li>
              <li><Link href="/substitution">{t('Substitution générique', 'الاستبدال الجنيس')}</Link></li>
              <li><Link href="/classes-therapeutiques">{t('Classes thérapeutiques (ATC)', 'الفئات العلاجية (ATC)')}</Link></li>
              <li><Link href="/articles">{t('Articles & Dossiers', 'مقالات ودراسات')}</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{t('Ressources', 'الموارد')}</h4>
            <ul className="footer-links">
              <li><Link href="/pharmacies">{t('Annuaire des pharmacies', 'دليل الصيدليات')}</Link></li>
              <li><Link href="/pro">{t('Espace Pro', 'الفضاء المهني')}</Link></li>
              <li><Link href="/contact">{t('Contact', 'اتصل بنا')}</Link></li>
              <li><Link href="/a-propos">{t('À propos', 'حول المنصة')}</Link></li>
              <li><Link href="/help">{t('Aide & guide', 'المساعدة والدليل')}</Link></li>
              <li><Link href="/help#application">{t('📲 Installer l’application', '📲 تثبيت التطبيق')}</Link></li>
              <li><Link href="/privacy">{t('Confidentialité', 'الخصوصية')}</Link></li>
              <li><a href="https://www.industrie.gov.dz" target="_blank" rel="noopener">{t('MIPH Algérie', 'MIPH الجزائر')}</a></li>
              <li><a href="https://www.ands.dz" target="_blank" rel="noopener">ANDS</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{t('Suivez-nous', 'تابعونا')}</h4>
            <ul className="footer-links">
              <li><a href="https://www.facebook.com/profile.php?id=61584995326062" target="_blank" rel="noopener">📘 Facebook</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} DwaDZ —{' '}
            {t(
              'Données à titre informatif uniquement. Consultez toujours les sources officielles.',
              'البيانات لأغراض إعلامية فقط. استشر دائمًا المصادر الرسمية.',
            )}
          </span>
          <div className="footer-social">
            <a href="https://www.facebook.com/profile.php?id=61584995326062" target="_blank" rel="noopener" title="Facebook">📘</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
