-- ============================================================
-- DwaDZ — Monographie IBUPROFENE : BROUILLONS à relire
--
-- Prérequis : sql/18_dci_monographies.sql
-- Application : psql "$DATABASE_URL" -f sql/19_seed_monographie_ibuprofene_brouillon.sql
--
-- Les lignes sont créées en status = 'brouillon', sans relecteur : rien n'est
-- visible du public. Pour publier, ouvrir /admin/monographies, relire chaque
-- section, renseigner « Relu par » et publier (source et relecteur exigés).
-- ON CONFLICT DO NOTHING : relancer ce script n'écrase jamais une version
-- déjà retravaillée dans l'admin.
--
-- La clé 'IBUPROFENE' doit correspondre à UPPER(TRIM(dci)) de la nomenclature
-- (vérifier dans l'admin la graphie exacte, ex. IBUPROFENE / IBUPROFENE LYSINE).
-- ============================================================

INSERT INTO dci_monographies
  (dci, lang, status, mecanisme, indications, posologie, contre_indications,
   effets_indesirables, grossesse_allaitement, interactions, sources)
VALUES (
  'IBUPROFENE', 'fr', 'brouillon',

  $md$L'ibuprofène est un anti-inflammatoire non stéroïdien (AINS), dérivé de l'acide propionique. Il inhibe les cyclo-oxygénases (COX-1 et COX-2) et diminue ainsi la synthèse des prostaglandines. Il a une action antalgique, antipyrétique et anti-inflammatoire.$md$,

  $md$Selon la spécialité, le dosage et la forme :
- traitement symptomatique de courte durée des douleurs d'intensité légère à modérée (maux de tête, douleurs dentaires, courbatures, douleurs menstruelles) ;
- traitement symptomatique de la fièvre ;
- aux dosages plus élevés et sur prescription : douleurs et inflammation des rhumatismes inflammatoires chroniques et de l'arthrose.

Les indications exactes dépendent de la spécialité : se référer à sa notice.$md$,

  $md$Utiliser la dose efficace la plus faible pendant la durée la plus courte nécessaire au soulagement des symptômes.

Chez l'adulte, en automédication, la dose quotidienne ne dépasse en général pas 1 200 mg, répartie en plusieurs prises espacées d'au moins 6 heures. Des doses plus élevées relèvent d'une prescription médicale. Le risque cardiovasculaire augmente à partir de 2 400 mg par jour.

Chez l'enfant, la dose se calcule en fonction du poids et de l'âge, et dépend de la forme (sirop, comprimé, suppositoire) : respecter la notice de la spécialité et l'avis du médecin. Prendre pendant ou après un repas pour limiter l'irritation gastrique.$md$,

  $md$- Allergie connue à l'ibuprofène, à un autre AINS ou à l'aspirine (asthme, rhinite, urticaire ou œdème déclenchés par ces médicaments).
- Ulcère gastroduodénal en évolution, ou antécédent d'hémorragie ou de perforation digestive liée à un AINS.
- Hémorragie en cours, notamment cérébrale.
- Insuffisance hépatique sévère, insuffisance rénale sévère, insuffisance cardiaque sévère.
- Grossesse à partir du début du 6e mois (24 semaines d'aménorrhée).

À éviter ou à utiliser avec précaution : varicelle (risque de complications cutanées infectieuses), déshydratation, asthme, antécédents de maladie cardiovasculaire, hypertension, maladie inflammatoire digestive, troubles de la coagulation. Demander l'avis d'un médecin ou d'un pharmacien.$md$,

  $md$Fréquents : douleurs d'estomac, nausées, vomissements, diarrhée, maux de tête, vertiges.

Moins fréquents ou rares mais importants :
- ulcère, hémorragie ou perforation digestive (selles noires, vomissements de sang) ;
- réactions allergiques, de l'éruption cutanée au choc anaphylactique, et réactions cutanées sévères (syndrome de Stevens-Johnson, DRESS) ;
- atteinte rénale, rétention d'eau, œdèmes, hypertension ;
- aux fortes doses et en traitement prolongé : léger surrisque d'infarctus du myocarde et d'accident vasculaire cérébral.

Arrêter le traitement et consulter en cas de signe digestif, cutané ou allergique inhabituel.$md$,

  $md$Grossesse : à partir de 24 semaines d'aménorrhée, l'ibuprofène est contre-indiqué, même pour une prise unique, en raison du risque pour le fœtus (atteinte rénale, fermeture prématurée du canal artériel). Avant 24 semaines, il ne doit être utilisé qu'en cas de nécessité absolue, à la dose la plus faible et sur la durée la plus courte, sur avis médical.

Allaitement : l'ibuprofène passe en très faible quantité dans le lait maternel ; demander l'avis d'un professionnel de santé avant la prise.

Fertilité : les AINS peuvent altérer de façon réversible la fertilité féminine ; en parler au médecin en cas de projet de grossesse.$md$,

  $md$- Autres AINS, aspirine à dose anti-inflammatoire : association déconseillée (addition des effets indésirables digestifs et rénaux).
- Anticoagulants, antiagrégants plaquettaires, héparines : risque hémorragique accru.
- Corticoïdes, inhibiteurs sélectifs de la recapture de la sérotonine : risque accru d'ulcère et de saignement digestif.
- Inhibiteurs de l'enzyme de conversion, antagonistes des récepteurs de l'angiotensine II, diurétiques : baisse de leur efficacité et risque d'insuffisance rénale, surtout chez la personne âgée ou déshydratée.
- Lithium : augmentation du taux de lithium dans le sang.
- Méthotrexate : augmentation de sa toxicité.
- Ciclosporine, tacrolimus : risque de toxicité rénale accru.

Signaler à son médecin ou pharmacien tous les médicaments pris, y compris sans ordonnance.$md$,

  $md$ANSM — Base de données publique des médicaments, RCP des spécialités à base d'ibuprofène (ex. Nurofen 400 mg, Ibuprofène Viatris 200 mg) : https://base-donnees-publique.medicaments.gouv.fr
EMA — Ibuprofen and dexibuprofen, article 31 referral (PRAC, avril 2015) : https://www.ema.europa.eu/en/documents/referral/ibuprofen-and-dexibuprofen-article-31-referral-assessment-report_en.pdf
Notice de la spécialité concernée (Algérie) : à compléter par le relecteur$md$
)
ON CONFLICT (dci, lang) DO NOTHING;

INSERT INTO dci_monographies
  (dci, lang, status, mecanisme, indications, posologie, contre_indications,
   effets_indesirables, grossesse_allaitement, interactions, sources)
VALUES (
  'IBUPROFENE', 'ar', 'brouillon',

  $md$الإيبوبروفين دواء مضاد للالتهاب غير ستيرويدي (AINS) من مشتقات حمض البروبيونيك. يثبّط إنزيمي الأكسدة الحلقية (COX-1 وCOX-2) فيقلل تصنيع البروستاغلاندينات، وله تأثير مسكّن وخافض للحرارة ومضاد للالتهاب.$md$,

  $md$بحسب الدواء والجرعة والشكل الصيدلاني :
- علاج عرضي قصير المدة للآلام الخفيفة إلى المتوسطة (الصداع، آلام الأسنان، آلام العضلات، آلام الدورة الشهرية) ؛
- علاج عرضي للحمى ؛
- بجرعات أعلى وبوصفة طبية : آلام والتهاب الروماتيزم الالتهابي المزمن والفصال العظمي.

دواعي الاستعمال الدقيقة تختلف من دواء إلى آخر : يُرجى الرجوع إلى نشرة الدواء.$md$,

  $md$يُستعمل بأقل جرعة فعالة ولأقصر مدة لازمة لتخفيف الأعراض.

عند البالغ، وفي حالة التطبيب الذاتي، لا تتجاوز الجرعة اليومية عادة 1200 ملغ موزعة على عدة جرعات بفاصل 6 ساعات على الأقل. الجرعات الأعلى تتطلب وصفة طبية، ويزداد الخطر القلبي الوعائي ابتداءً من 2400 ملغ يوميا.

عند الطفل تُحسب الجرعة بحسب الوزن والسن ونوع الشكل (شراب، أقراص، تحاميل) : يُرجى احترام نشرة الدواء ورأي الطبيب. يُفضل تناوله أثناء الأكل أو بعده للحد من تخريش المعدة.$md$,

  $md$- حساسية معروفة تجاه الإيبوبروفين أو مضاد التهاب غير ستيرويدي آخر أو الأسبرين (ربو أو التهاب أنف أو شرى أو وذمة ناجمة عنها).
- قرحة معدية أو اثني عشرية نشطة، أو سوابق نزيف أو ثقب هضمي مرتبط بهذه الأدوية.
- نزيف جارٍ، خاصة الدماغي.
- قصور كبدي أو كلوي أو قلبي شديد.
- الحمل ابتداءً من بداية الشهر السادس (24 أسبوعا من انقطاع الطمث).

يُتجنب أو يُستعمل بحذر في : جدري الماء، الجفاف، الربو، سوابق أمراض القلب والأوعية، ارتفاع ضغط الدم، أمراض الأمعاء الالتهابية، اضطرابات التخثر. يُرجى استشارة طبيب أو صيدلي.$md$,

  $md$شائعة : ألم المعدة، غثيان، قيء، إسهال، صداع، دوار.

أقل شيوعا أو نادرة لكنها مهمة :
- قرحة أو نزيف أو ثقب هضمي (براز أسود، قيء دموي) ؛
- تفاعلات تحسسية من الطفح الجلدي إلى الصدمة التأقية، وتفاعلات جلدية شديدة (متلازمة ستيفنز جونسون، DRESS) ؛
- اضطراب كلوي، احتباس السوائل، وذمات، ارتفاع الضغط ؛
- عند الجرعات العالية والعلاج المطول : ارتفاع طفيف في خطر احتشاء عضلة القلب والسكتة الدماغية.

يُوقف العلاج ويُستشار الطبيب عند ظهور أي علامة هضمية أو جلدية أو تحسسية غير معتادة.$md$,

  $md$الحمل : ابتداءً من 24 أسبوعا من انقطاع الطمث يُمنع الإيبوبروفين حتى لجرعة واحدة، بسبب خطره على الجنين (تضرر الكلى، انغلاق مبكر للقناة الشريانية). قبل 24 أسبوعا لا يُستعمل إلا عند الضرورة القصوى، بأقل جرعة ولأقصر مدة وبرأي الطبيب.

الرضاعة : يمر الإيبوبروفين بكمية ضئيلة جدا إلى حليب الأم ؛ يُستشار مختص صحي قبل التناول.

الخصوبة : قد تضعف مضادات الالتهاب غير الستيرويدية خصوبة المرأة بشكل عكوس ؛ يُرجى إخبار الطبيب عند التخطيط للحمل.$md$,

  $md$- مضادات التهاب غير ستيرويدية أخرى، أسبرين بجرعة مضادة للالتهاب : جمع غير منصوح به (تراكم الآثار الهضمية والكلوية).
- مضادات التخثر ومضادات الصفيحات والهيبارينات : زيادة خطر النزف.
- الكورتيكويدات ومثبطات إعادة امتصاص السيروتونين الانتقائية : زيادة خطر القرحة والنزف الهضمي.
- مثبطات الإنزيم المحوِّل ومضادات مستقبلات الأنجيوتنسين II ومدرات البول : انخفاض فعاليتها وخطر القصور الكلوي، خاصة عند المسن أو في حالة الجفاف.
- الليثيوم : ارتفاع مستواه في الدم.
- الميثوتريكسات : زيادة سميته.
- السيكلوسبورين والتاكروليموس : زيادة خطر السمية الكلوية.

يُرجى إعلام الطبيب أو الصيدلي بكل الأدوية المتناولة، بما فيها تلك بدون وصفة.$md$,

  $md$ANSM — قاعدة البيانات العمومية للأدوية، ملخصات خصائص المنتج (RCP) للأدوية المحتوية على الإيبوبروفين : https://base-donnees-publique.medicaments.gouv.fr
EMA — Ibuprofen and dexibuprofen, article 31 referral (PRAC، أفريل 2015) : https://www.ema.europa.eu/en/documents/referral/ibuprofen-and-dexibuprofen-article-31-referral-assessment-report_en.pdf
نشرة الدواء المعني (الجزائر) : يستكملها المراجع$md$
)
ON CONFLICT (dci, lang) DO NOTHING;
