'use client'

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
            <div className="footer-logo">💊 PharmaVeille DZ</div>
            <p className="footer-desc">
              {t(
                "La référence pour les pharmaciens algériens. Données officielles du Ministère de l'Industrie Pharmaceutique (MIPH). Recherche, alertes retraits, nouveaux enregistrements.",
                'المرجع للصيادلة الجزائريين. بيانات رسمية من وزارة الصناعة الصيدلانية (MIPH). بحث، تنبيهات السحب، التسجيلات الجديدة.',
              )}
            </p>
            <div style={{ marginTop: 14 }}>
              <span className="footer-badge">{t('DONNÉES MIPH 2025', 'بيانات MIPH 2025')}</span>
            </div>
          </div>

          <div className="footer-col">
            <h4>{t('Navigation', 'التنقل')}</h4>
            <ul className="footer-links">
              <li><Link href="/">{t('Accueil', 'الرئيسية')}</Link></li>
              <li><Link href="/recherche">{t('Recherche', 'البحث')}</Link></li>
              <li><Link href="/alertes">{t('Alertes & Retraits', 'التنبيهات والسحب')}</Link></li>
              <li><Link href="/substitution">{t('Substitution générique', 'الاستبدال الجنيس')}</Link></li>
              <li><Link href="/veille">{t('Veille réglementaire', 'المراقبة التنظيمية')}</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{t('Ressources', 'الموارد')}</h4>
            <ul className="footer-links">
              <li><Link href="/medicaments">{t('Tous les médicaments', 'كل الأدوية')}</Link></li>
              <li><Link href="/contact">{t('Contact', 'اتصل بنا')}</Link></li>
              <li><Link href="/a-propos">{t('À propos', 'حول المنصة')}</Link></li>
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

        {/* Mobile quick-links bar */}
        <div className="footer-mobile-quicklinks">
          <Link href="/recherche">🔍 {t('Recherche', 'البحث')}</Link>
          <Link href="/alertes">🚨 {t('Alertes', 'التنبيهات')}</Link>
          <Link href="/substitution">♻️ {t('Substitution', 'الاستبدال')}</Link>
          <Link href="/a-propos">ℹ️ {t('À propos', 'حول')}</Link>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} PharmaVeille DZ —{' '}
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
