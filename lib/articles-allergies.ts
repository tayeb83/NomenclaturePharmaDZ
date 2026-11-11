import type { Article } from './articles'

/**
 * Article d'explication de l'option « Allergie connue » (FR + AR) : qu'est-ce qu'une allergie, la source HDO, comment le travail
 * a été intégré (alignement sur l'ATC), fiche médicament, filtre de recherche, limites. À garder aligné sur
 * components/drug/AllergiesSection.tsx (libellés de la fiche), app/recherche/SearchClient.tsx (filtre), app/allergies/[code]/page.tsx
 * et lib/allergies-core.ts (règles de rapprochement).
 *
 * Les nombres (122 allergies, 51 rattachées à une substance de médicament) viennent de data/hdo/hdo_allergies_alignement.xlsx
 * (onglet Bilan) et bougent avec la version de HDO : le texte le dit. Les exemples (amoxicilline, pénicillines, co-trimoxazole)
 * sont ceux testés dans tests/allergies/allergies.test.ts. Aucun conseil clinique : l'article décrit un outil.
 */
export const ARTICLES_ALLERGIES: Article[] = [
  {
    slug: 'allergie-connue-medicaments-algerie-mode-emploi',
    lang: 'fr',
    audience: 'professionnel',
    title: 'L’option « Allergie connue » de DwaDZ : comprendre les allergies médicamenteuses et s’en servir, pas à pas',
    subtitle: 'C’est quoi une allergie, d’où viennent les données (HDO), comment elles ont été reliées aux substances, et comment signaler les médicaments concernés',
    description:
      'Guide pour pharmaciens et étudiants : définition de l’allergie médicamenteuse, source Human Disease Ontology (HDO), méthode d’alignement sur les substances et l’ATC, onglet Allergies de la fiche médicament, filtre « Allergie connue » de la recherche (signaler ou masquer), exemples et limites.',
    seoTitle: 'Allergie connue : signaler les médicaments concernés en Algérie (DwaDZ, source HDO) — mode d’emploi',
    seoKeywords: ['allergie médicamenteuse', 'allergie pénicilline médicament Algérie', 'Human Disease Ontology', 'HDO allergie', 'allergie croisée', 'recherche médicament allergie', 'nomenclature pharmaceutique algérienne', 'pharmacie officine allergie'],
    date: '2026-11-11',
    readingTime: 11,
    tags: ['Allergies', 'HDO', 'Recherche', 'ATC', 'Pharmacovigilance', 'Outils', 'Étudiants'],
    faq: [
      {
        question: 'L’option « Allergie connue » est-elle gratuite et faut-il un compte ?',
        answer: 'Oui, elle est ouverte à tous, sans compte. L’onglet « Allergies » se trouve sur la fiche des médicaments concernés, et le bouton « 🩺 Allergie connue » sur la page de recherche (/recherche).',
      },
      {
        question: 'Qu’est-ce que HDO ?',
        answer: 'La Human Disease Ontology est une ontologie ouverte : un vocabulaire structuré des maladies, où chaque notion a un identifiant (DOID:0040004 pour l’allergie à l’amoxicilline), une définition, des liens hiérarchiques et des références bibliographiques. DwaDZ en utilise la partie « allergies », avec l’agent déclencheur de chacune.',
      },
      {
        question: 'Pourquoi ne trouve-t-on que quelques dizaines d’allergies ?',
        answer: 'Parce que HDO ne décrit qu’une sélection d’allergies à déclencheur documenté : dans l’extraction utilisée, 122 allergies dont 51 visent une substance de médicament. Les autres concernent des aliments, des métaux ou des produits de l’industrie. C’est un recensement partiel : l’absence d’une allergie dans DwaDZ ne signifie jamais qu’il n’y a pas de risque.',
      },
      {
        question: 'Faut-il choisir « Signaler » ou « Masquer » ?',
        answer: '« Signaler » garde tous les résultats et ajoute un badge sur ceux qui sont concernés : c’est le mode à privilégier. « Masquer » les retire de la liste, ce qui peut cacher une alternative que vous auriez voulu examiner ; le compteur indique combien ont été masqués.',
      },
      {
        question: 'DwaDZ déduit-il des allergies croisées ?',
        answer: 'Non. Choisir l’allergie à l’amoxicilline signale les médicaments qui contiennent de l’amoxicilline, pas les autres pénicillines. Choisir la classe « pénicillines » signale les pénicillines, pas les céphalosporines. Les allergies croisées dépendent de la structure, de la réaction et du patient : c’est un jugement de professionnel, pas un calcul automatique.',
      },
      {
        question: 'Est-ce une contre-indication officielle ?',
        answer: 'Non. HDO recense des allergies décrites dans la littérature. Ce n’est ni une contre-indication réglementaire ni un avis médical. La référence reste le RCP du médicament et l’avis du médecin ou du pharmacien.',
      },
      {
        question: 'Pourquoi les noms des allergies sont-ils en français « brouillon » ?',
        answer: 'HDO est en anglais. Les libellés français (« Allergie — amoxicilline ») sont générés puis relus au fil du temps : ils portent la mention de brouillon tant qu’ils ne sont pas validés. Le code HDO, lui, ne change pas et sert de repère.',
      },
      {
        question: 'Comment signaler une erreur de rattachement ?',
        answer: 'Par la page Contact (/contact), en indiquant le médicament ou le code HDO concerné. Chaque rattachement est automatique et peut être corrigé à la main.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'Au comptoir, la phrase revient souvent : « Je suis allergique à la pénicilline. » Quels médicaments de la nomenclature contiennent une pénicilline ? Et que veut-on dire par « allergique » ? DwaDZ a ajouté deux outils : un onglet « Allergies » sur la fiche d’un médicament, et un filtre « Allergie connue » dans la recherche, qui signale les médicaments concernés. Cet article explique ce qu’est une allergie, d’où viennent les données, comment elles ont été reliées aux substances, et comment s’en servir sans en attendre plus qu’elles ne donnent.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Information, pas une prescription. L’option signale des allergies décrites dans la littérature. Elle ne remplace ni le RCP, ni l’ordonnance, ni l’avis du médecin ou du pharmacien, et l’absence de signalement ne veut pas dire « sans risque ».',
      },

      { type: 'h2', title: '1. Une allergie, c’est quoi ?' },
      {
        type: 'paragraph',
        text: 'Une allergie est une réaction du système immunitaire à une substance (l’allergène) qui est inoffensive pour la plupart des gens. Le principe est celui d’une « mauvaise reconnaissance » : lors d’un premier contact, l’organisme se sensibilise ; lors d’un contact ultérieur, il réagit. La réaction peut être immédiate (urticaire, gonflement du visage, gêne respiratoire, choc anaphylactique) ou retardée (éruption, eczéma de contact, qui apparaissent après plusieurs heures ou jours).',
      },
      {
        type: 'paragraph',
        text: 'Toutes les réactions à un médicament ne sont pas des allergies. Cette distinction est la première chose à faire quand un patient dit « je ne supporte pas tel médicament ».',
      },
      {
        type: 'table',
        headers: ['Notion', 'Mécanisme', 'Exemple', 'Dépend de la dose ?'],
        rows: [
          { cells: ['Allergie', 'Réaction immunitaire, après sensibilisation', 'Urticaire et gonflement après une prise d’amoxicilline', 'Peu : une petite quantité peut suffire'] },
          { cells: ['Effet indésirable', 'Conséquence de l’action pharmacologique du médicament, sans l’immunité', 'Somnolence avec un antihistaminique sédatif ; toux sous un IEC', 'Oui, souvent'] },
          { cells: ['Intolérance', 'Réaction non immunitaire, souvent digestive, chez certains patients', 'Troubles digestifs sous metformine', 'Souvent'] },
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'À retenir : une étiquette « allergique à… » dans un dossier n’est pas toujours une allergie confirmée. Pour les pénicillines notamment, une part importante des allergies déclarées n’est pas retrouvée après exploration par un allergologue. C’est une raison de plus de demander les détails plutôt que de s’en tenir à l’étiquette.',
      },
      { type: 'h3', title: 'Les questions utiles quand un patient déclare une allergie' },
      {
        type: 'list',
        items: [
          '**À quelle substance ?** Le nom exact (amoxicilline) ou seulement la famille (« les antibiotiques ») ?',
          '**Quelle réaction ?** Urticaire, œdème, gêne respiratoire, malaise, simple trouble digestif ?',
          '**Quand ?** Combien de temps après la prise, et il y a combien d’années ?',
          '**Confirmée ?** Un allergologue a-t-il exploré le dossier ? Y a-t-il eu une réintroduction sans problème ?',
        ],
      },
      { type: 'h3', title: 'Et l’allergie croisée ?' },
      {
        type: 'paragraph',
        text: 'On parle d’allergie croisée quand une personne allergique à une substance réagit aussi à une autre, parce que l’organisme reconnaît une partie commune de leur structure. Elle ne se devine pas à partir du seul nom d’une famille : elle dépend des substances en cause, du type de réaction et de la personne. C’est pourquoi DwaDZ n’en déduit aucune : l’outil se limite à ce qui est écrit (la substance de l’allergie, ou la classe qu’elle nomme). La décision revient au professionnel.',
      },

      { type: 'h2', title: '2. D’où viennent les allergies : la Human Disease Ontology' },
      {
        type: 'paragraph',
        text: 'Les allergies affichées par DwaDZ viennent de la Human Disease Ontology (HDO ou DO), une ontologie ouverte des maladies. Une ontologie est un vocabulaire structuré : chaque notion y a un identifiant stable, une définition, un parent (l’« allergie à l’amoxicilline » est un type d’« allergie aux bêta-lactamines », qui est un type d’« allergie médicamenteuse »), et des références. Dans HDO, une allergie est reliée à son agent déclencheur, lui-même identifié dans une autre ontologie.',
      },
      {
        type: 'table',
        headers: ['Élément', 'Exemple', 'Ce que c’est'],
        rows: [
          { cells: ['Code HDO', 'DOID:0040004', 'L’identifiant de l’allergie. DwaDZ l’affiche « HDO 0040004 » et il ne change pas, même si le libellé est retouché.'] },
          { cells: ['Libellé', 'amoxicillin allergy', 'Le nom anglais de HDO. DwaDZ propose un libellé français en brouillon : « Allergie — amoxicilline ».'] },
          { cells: ['Agent déclencheur', 'CHEBI:2676 (amoxicillin)', 'Ce qui déclenche l’allergie : ChEBI pour les substances chimiques, FoodOn et NCBI Taxon pour les aliments et les êtres vivants.'] },
          { cells: ['Références', 'PubMed', 'Les publications qui décrivent l’allergie, citées sur la fiche de chaque allergie.'] },
        ],
      },
      { type: 'h3', title: 'Tous les agents ne sont pas des substances de médicament' },
      {
        type: 'paragraph',
        text: 'L’extraction de HDO utilisée décrit 122 allergies. En les regardant une à une, on constate que beaucoup n’ont rien à voir avec un médicament : des allergies alimentaires (pomme, crevette, saumon…), des métaux (nickel, cobalt, chrome), des produits de l’industrie (isocyanates, anhydrides). Elles ont été triées selon ce qu’on peut en faire dans DwaDZ.',
      },
      {
        type: 'table',
        headers: ['Catégorie', 'Allergies', 'Ce que DwaDZ en fait'],
        rows: [
          { cells: ['Substance ou classe de médicament', '51', 'Rattachées aux fiches : onglet Allergies et filtre de recherche.'] },
          { cells: ['Excipients (lait, œuf, poisson, légumineuses, conservateurs)', '7', 'Listées et grisées sur la fiche, mais non évaluées : la nomenclature ne donne pas la composition en excipients.'] },
          { cells: ['Latex', '1', 'Matériau des bouchons et des seringues : non porté par la nomenclature.'] },
          { cells: ['Aliments, métaux, chimie industrielle', '60', 'Hors périmètre.'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Les 122 allergies se répartissent ainsi : 51 + 7 + 1 + 60, plus deux niveaux de regroupement (« allergie médicamenteuse », « allergie aux métaux ») et une aspergillose, qui est une infection et non une allergie, écartés. Ces nombres sont ceux de l’extraction au moment de l’intégration ; ils évolueront avec les versions de HDO.',
      },

      { type: 'h2', title: '3. Comment le travail a été intégré' },
      {
        type: 'paragraph',
        text: 'Une allergie HDO parle d’une substance en anglais (« amoxicillin »). La nomenclature algérienne parle de DCI en français (« AMOXICILLINE »). Il fallait donc un pont, et il existait déjà sur le site : la classification ATC de l’OMS.',
      },
      {
        type: 'list',
        items: [
          '**1. Extraire** : pour chaque allergie, son code, son libellé, sa définition, son agent déclencheur et ses références.',
          '**2. Trier** : substance de médicament, excipient, latex, ou hors périmètre (voir le tableau ci-dessus). Quelques anomalies de la source ont été repérées et neutralisées : une aspergillose (une infection, pas une allergie) figurait dans la liste, et une allergie au méropénème était rangée parmi les asthmes.',
          '**3. Relier à une substance ou à une classe par l’ATC** : l’agent est comparé au nom d’une substance de l’ATC. Les noms équivalents sont reconnus (succinylcholine = suxaméthonium), ainsi que les sels (« bromure de rocuronium »).',
          '**4. Dire la nature du lien**, comme pour les termes EDQM de la forme galénique (voir le tableau suivant).',
          '**5. Ne rien inventer** : sans rattachement sûr, aucun lien n’est créé. Un rattachement douteux est marqué « à confirmer » plutôt que présenté comme certain.',
          '**6. Ne rien déduire** : pas d’allergie croisée, pas de conseil. Seuls les codes SNOMED CT et UMLS présents dans l’extraction ne sont pas repris dans le site, le temps de vérifier leur licence.',
        ],
      },
      {
        type: 'table',
        headers: ['Relation', 'Signe', 'Sens', 'Exemple'],
        rows: [
          { cells: ['Exacte', '(aucun)', 'L’allergie vise cette substance précisément (même fraction active ; un sel ne change pas la relation).', 'HDO 0040004 : amoxicilline'] },
          { cells: ['Classe', '⊂', 'L’allergie vise une classe, et s’applique à toutes les substances de ses codes ATC, à elles seules.', 'HDO 0060520 : pénicillines (ATC J01C)'] },
          { cells: ['Proche', '≈', 'Meilleur rattachement disponible, à confirmer.', 'HDO 0040076 : groupe phtalyle → phtalylsulfathiazole'] },
        ],
      },
      { type: 'h3', title: 'Un exemple : de l’amoxicilline aux bêta-lactamines' },
      {
        type: 'paragraph',
        text: 'Une fiche d’AMOXICILLINE (ATC J01CA04) est reliée à trois allergies : l’allergie à l’amoxicilline elle-même (relation exacte), l’allergie aux pénicillines (classe J01C), et l’allergie aux bêta-lactamines (classes J01C et J01D). Dans HDO, l’amoxicilline n’est reliée qu’aux bêta-lactamines ; c’est la hiérarchie de l’ATC qui permet de remonter aux pénicillines. Le même procédé fait remonter une céphalosporine (ATC J01DD04, ceftriaxone) à l’allergie aux céphalosporines et à celle aux bêta-lactamines, mais pas à celle des pénicillines.',
      },

      { type: 'h2', title: '4. Sur la fiche d’un médicament' },
      {
        type: 'paragraph',
        text: 'Si la substance du médicament (ou sa classe) correspond à une allergie, la fiche affiche une section « Allergies documentées ». Elle apparaît à côté des interactions, avec des onglets « Interactions » et « Allergies » quand les deux existent, et un bouton « Voir les allergies (n) » dans la colonne de droite. Un médicament retiré n’en affiche pas.',
      },
      {
        type: 'table',
        headers: ['Niveau', 'Ce qu’on y voit', 'Exemple (amoxicilline)'],
        rows: [
          { cells: ['1. Cette substance', 'Les allergies à la substance de la fiche', 'HDO 0040004 · Allergie — amoxicilline · substance'] },
          { cells: ['2. Classes de la substance', 'Les allergies à une classe dont elle fait partie, de la plus précise à la plus large', 'HDO 0060520 ⊂ pénicillines · HDO 0060519 ⊂ bêta-lactamines'] },
          { cells: ['3. Excipients (grisés)', 'Les allergies à des excipients usuels : à titre d’information, non évaluées', 'Lait, œuf, conservateurs… : voir la composition dans le RCP'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'Le code en rose, devant chaque allergie, est cliquable : il ouvre la fiche de l’allergie (voir le chapitre 6). Le signe ⊂ rappelle qu’il s’agit d’une classe plus large que la substance.',
      },

      { type: 'h2', title: '5. Dans la recherche : le filtre « Allergie connue »' },
      {
        type: 'list',
        items: [
          'Ouvrez la page de recherche (/recherche) et saisissez ce que vous cherchez, par exemple « amoxi ».',
          'Cliquez sur « 🩺 Allergie connue » : un panneau s’ouvre.',
          'Choisissez l’allergie dans la liste : les classes d’abord, puis les substances. Le code HDO est devant chaque libellé.',
          'Choisissez le mode : « Signaler » (recommandé) ou « Masquer ».',
          'La liste se met à jour. Un bandeau rappelle l’allergie choisie, le nombre de présentations signalées ou masquées, et un lien vers sa fiche.',
          'Pour retirer le filtre, cliquez sur ✕ dans le bandeau.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Le choix reste en place quand vous saisissez une autre recherche : l’allergie est une donnée du patient, pas de la liste. Il est inscrit dans l’adresse de la page (…?allergie=0060520&allergie_mode=signaler) : copier le lien suffit pour partager la même vue.',
      },
      {
        type: 'table',
        headers: ['Mode', 'Ce qui se passe', 'Quand l’utiliser'],
        rows: [
          { cells: ['Signaler', 'Tous les résultats restent ; ceux qui sont concernés portent un badge rose « ⚠ HDO … Allergie connue » avec la substance ou la classe en cause.', 'Dans la plupart des cas : vous voyez tout, et ce qui est concerné ressort.'] },
          { cells: ['Masquer', 'Les résultats concernés sont retirés de la liste ; le bandeau compte combien.', 'Pour alléger une longue liste. Attention : un médicament masqué n’est plus visible, y compris quand on cherche justement à l’examiner.'] },
        ],
      },
      { type: 'h3', title: 'Ce que chaque choix signale, et ce qu’il ne signale pas' },
      {
        type: 'table',
        headers: ['Allergie choisie', 'Signalé', 'Pas signalé'],
        rows: [
          { cells: ['HDO 0040004 : amoxicilline', 'Les médicaments qui contiennent de l’amoxicilline, seule ou associée (amoxicilline + acide clavulanique)', 'L’ampicilline et les autres pénicillines'] },
          { cells: ['HDO 0060520 ⊂ pénicillines', 'Toutes les pénicillines (ATC J01C) : amoxicilline, ampicilline, benzylpénicilline…', 'Les céphalosporines (J01D)'] },
          { cells: ['HDO 0060519 ⊂ bêta-lactamines', 'Les pénicillines (J01C) et les autres bêta-lactamines (J01D) : céphalosporines, carbapénèmes, monobactams', 'Tout ce qui n’est pas une bêta-lactamine'] },
          { cells: ['HDO 0040070 : co-trimoxazole', 'Les associations sulfaméthoxazole + triméthoprime', 'Le triméthoprime seul'] },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'Essayez : recherchez « cef » en choisissant l’allergie aux pénicillines. Rien n’est signalé pour la ceftriaxone ou le céfixime, parce que ce ne sont pas des pénicillines et que DwaDZ ne déduit pas d’allergie croisée. Pour les signaler, choisissez la classe « bêta-lactamines » (qui comprend les deux familles) ou « céphalosporines » : c’est un choix du professionnel, que l’outil rend visible.',
      },

      { type: 'h2', title: '6. La fiche d’une allergie' },
      {
        type: 'paragraph',
        text: 'Chaque code HDO est cliquable, sur la fiche d’un médicament, dans le bandeau de la recherche et sur les badges des résultats. Il mène à une page /allergies/<code>, par exemple /allergies/0060520 pour les pénicillines. On y trouve : la définition HDO, l’agent déclencheur (avec son identifiant ChEBI et un lien vers la source), la nature du rattachement et les codes ATC, la liste des DCI de la nomenclature concernées avec leur nombre de présentations, puis les références (PubMed et autres). Un lien « Signaler cette allergie dans la recherche » prépare la recherche avec le filtre déjà réglé.',
      },

      { type: 'h2', title: '7. Les limites à garder en tête' },
      {
        type: 'list',
        items: [
          '**Un recensement partiel.** 51 allergies visent des substances de médicaments : c’est une sélection de HDO, pas toutes les allergies possibles.',
          '**Information, pas décision.** Le site ne dit pas si un médicament est sûr ou non pour un patient. Il met en évidence une allergie décrite.',
          '**Rattachement automatique.** Il repose sur le nom de la substance et sur l’ATC. Les associations bronchodilatateur + corticoïde (codes ATC R03AK et R03AL) ne sont par exemple pas signalées pour l’allergie aux corticoïdes, parce que leurs codes mélangent des produits avec et sans corticoïde.',
          '**Excipients non évalués.** La nomenclature donne la substance active, pas la composition complète. La composition se lit dans le RCP.',
          '**Libellés en brouillon.** Le français est à relire ; l’arabe des noms d’allergies s’affiche en français avec une mention en attendant.',
          '**Version de HDO.** Les données ont la date de l’extraction utilisée : elles seront mises à jour avec les versions de la source.',
        ],
      },

      { type: 'h2', title: '8. Pour réviser (étudiants)' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'Un patient a des troubles digestifs sous metformine. De quoi parle-t-on le plus probablement ?',
            options: [
              { label: 'A', text: 'D’une allergie : le système immunitaire a réagi.' },
              { label: 'B', text: 'D’un effet indésirable ou d’une intolérance, sans mécanisme immunitaire.' },
              { label: 'C', text: 'D’une allergie croisée.' },
            ],
            answer: 'B',
          },
          {
            question: 'Dans DwaDZ, on choisit l’allergie « amoxicilline » et on cherche « ampi ». Que se passe-t-il pour l’ampicilline ?',
            options: [
              { label: 'A', text: 'Elle est signalée, car c’est une pénicilline.' },
              { label: 'B', text: 'Elle n’est pas signalée : l’outil ne déduit pas d’allergie croisée.' },
              { label: 'C', text: 'Elle est masquée automatiquement.' },
            ],
            answer: 'B',
          },
          {
            question: 'Que signifie le signe ⊂ après un code HDO ?',
            options: [
              { label: 'A', text: 'L’allergie vise une classe plus large que la substance de la fiche.' },
              { label: 'B', text: 'L’allergie est confirmée par un allergologue.' },
              { label: 'C', text: 'Le rattachement est à confirmer.' },
            ],
            answer: 'A',
          },
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Une erreur ou une suggestion ? Écrivez-nous via la page Contact (/contact), avec le médicament ou le code HDO concerné. Source : Human Disease Ontology. Cet article décrit un outil d’information ; il ne remplace ni le RCP, ni l’ordonnance, ni l’avis du médecin ou du pharmacien.',
      },
    ],
  },

  {
    slug: 'allergie-connue-medicaments-algerie-mode-emploi-ar',
    lang: 'ar',
    audience: 'professionnel',
    title: 'خيار «حساسية معروفة» في DwaDZ: فهم الحساسية الدوائية واستعماله خطوة بخطوة',
    subtitle: 'ما هي الحساسية، ومن أين جاءت المعطيات (HDO)، وكيف رُبطت بالمواد الفعالة، وكيف تُميَّز الأدوية المعنية',
    description:
      'دليل للصيادلة والطلبة: تعريف الحساسية الدوائية، ومصدر أنطولوجيا الأمراض البشرية (HDO)، ومنهج الربط بالمواد الفعالة وبنظام ATC، وتبويب «الحساسيات» في بطاقة الدواء، ومرشح «حساسية معروفة» في البحث (تمييز أو إخفاء)، مع أمثلة وحدود الاستعمال.',
    seoTitle: 'حساسية معروفة: تمييز الأدوية المعنية في الجزائر (DwaDZ، مصدر HDO): دليل الاستعمال',
    seoKeywords: ['الحساسية الدوائية', 'حساسية البنسلين دواء الجزائر', 'أنطولوجيا الأمراض البشرية', 'HDO حساسية', 'حساسية متصالبة', 'البحث عن دواء حسب الحساسية', 'المدونة الصيدلانية الجزائرية', 'صيدلية حساسية'],
    date: '2026-11-11',
    readingTime: 11,
    tags: ['الحساسيات', 'HDO', 'البحث', 'ATC', 'اليقظة الدوائية', 'أدوات', 'طلبة'],
    faq: [
      {
        question: 'هل خيار «حساسية معروفة» مجاني وهل أحتاج إلى حساب؟',
        answer: 'نعم، هو مفتوح للجميع دون حساب. يوجد تبويب «الحساسيات» في بطاقة الأدوية المعنية، وزر «🩺 حساسية معروفة» في صفحة البحث (/recherche).',
      },
      {
        question: 'ما هي HDO؟',
        answer: 'أنطولوجيا الأمراض البشرية (Human Disease Ontology) أنطولوجيا مفتوحة: أي قاموس منظَّم للأمراض، لكل مفهوم فيه معرّف (DOID:0040004 للحساسية تجاه الأموكسيسيلين)، وتعريف، وروابط هرمية، ومراجع علمية. يستعمل DwaDZ جزء «الحساسيات» منها مع العامل المسبّب لكل حساسية.',
      },
      {
        question: 'لماذا لا نجد إلا عشرات الحساسيات؟',
        answer: 'لأن HDO لا تصف إلا مجموعة منتقاة من الحساسيات ذات المسبّب الموثّق: في الاستخراج المعتمد 122 حساسية، منها 51 تخص مادة دوائية. أما البقية فتخص أغذية ومعادن ومنتجات صناعية. هذا إحصاء جزئي: غياب حساسية في DwaDZ لا يعني أبدًا انعدام الخطر.',
      },
      {
        question: 'هل أختار «تمييز» أم «إخفاء»؟',
        answer: '«تمييز» يُبقي كل النتائج ويضيف شارة على المعنيّ منها، وهو الوضع المفضّل. أما «إخفاء» فيحذفها من القائمة، وقد يخفي بديلًا كنت تريد فحصه، والعدّاد يبيّن عدد ما أُخفي.',
      },
      {
        question: 'هل يستنتج DwaDZ حساسيات متصالبة؟',
        answer: 'لا. اختيار الحساسية تجاه الأموكسيسيلين يميّز الأدوية المحتوية على الأموكسيسيلين، لا بقية البنسلينات. واختيار صنف «البنسلينات» يميّز البنسلينات، لا السيفالوسبورينات. فالحساسية المتصالبة تتعلق بالبنية ونوع التفاعل والمريض: هي حكم يعود إلى المختص، وليست حسابًا آليًا.',
      },
      {
        question: 'هل هذا مانع استعمال رسمي؟',
        answer: 'لا. تُحصي HDO حساسيات موثّقة في الأدبيات الطبية، وهذا ليس مانع استعمال تنظيميًا ولا رأيًا طبيًا. المرجع يبقى ملخص خصائص الدواء (RCP) ورأي الطبيب أو الصيدلي.',
      },
      {
        question: 'لماذا أسماء الحساسيات بالفرنسية «مسودة»؟',
        answer: 'HDO بالإنجليزية. التسميات الفرنسية («Allergie — amoxicilline») مولَّدة وتُراجَع مع الوقت، وتحمل وصف المسودة ما دامت غير معتمدة. أما رمز HDO فلا يتغير ويبقى المرجع. وفي الصفحة العربية تظهر أسماء الحساسيات بالفرنسية مع تنبيه.',
      },
      {
        question: 'كيف أبلغ عن خطأ في الربط؟',
        answer: 'عبر صفحة «اتصل بنا» (/contact) مع ذكر الدواء أو رمز HDO المعني. الربط آلي ويمكن تصحيحه يدويًا.',
      },
    ],
    content: [
      {
        type: 'intro',
        text: 'عند المنضدة تتكرر العبارة: «عندي حساسية من البنسلين». فأيّ أدوية في المدونة تحتوي على بنسلين؟ وماذا نقصد بـ«حساسية» أصلًا؟ أضاف DwaDZ أداتين: تبويب «الحساسيات» في بطاقة الدواء، ومرشح «حساسية معروفة» في البحث يميّز الأدوية المعنية. يشرح هذا المقال ما هي الحساسية، ومن أين جاءت المعطيات، وكيف رُبطت بالمواد الفعالة، وكيف نستعملها دون أن ننتظر منها أكثر مما تعطي.',
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'معلومة وليست وصفة طبية. يميّز الخيار حساسيات موثّقة في الأدبيات الطبية، ولا يغني عن ملخص خصائص المنتج (RCP) ولا عن الوصفة ولا عن رأي الطبيب أو الصيدلي. وعدم التمييز لا يعني «لا خطر».',
      },

      { type: 'h2', title: '1. ما هي الحساسية؟' },
      {
        type: 'paragraph',
        text: 'الحساسية تفاعل يقوم به الجهاز المناعي تجاه مادة (مسبّب الحساسية) لا تضر أغلب الناس. والمبدأ هو «خطأ في التعرّف»: عند أول تماس يتحسّس الجسم، وعند التماس اللاحق يتفاعل. وقد يكون التفاعل فوريًا (شرى، تورّم الوجه، ضيق في التنفس، صدمة تأقية) أو متأخرًا (طفح، أكزيما تماسّية تظهر بعد ساعات أو أيام).',
      },
      {
        type: 'paragraph',
        text: 'ليست كل التفاعلات مع دواء حساسية. وهذا التمييز أول ما يجب فعله حين يقول المريض «لا أتحمّل هذا الدواء».',
      },
      {
        type: 'table',
        headers: ['المفهوم', 'الآلية', 'مثال', 'هل يتعلق بالجرعة؟'],
        rows: [
          { cells: ['الحساسية', 'تفاعل مناعي بعد تحسّس سابق', 'شرى وتورّم بعد تناول الأموكسيسيلين', 'قليلًا: كمية صغيرة قد تكفي'] },
          { cells: ['أثر غير مرغوب فيه', 'نتيجة للفعل الدوائي للدواء دون تدخّل المناعة', 'نعاس مع مضاد هيستامين مهدّئ؛ سعال مع مثبّطات الإنزيم المحوّل', 'نعم، غالبًا'] },
          { cells: ['عدم تحمّل', 'تفاعل غير مناعي، غالبًا هضمي، عند بعض المرضى', 'اضطرابات هضمية مع الميتفورمين', 'غالبًا'] },
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'للتذكّر: عبارة «حساسية من…» في ملف المريض ليست دائمًا حساسية مؤكدة. وفي البنسلينات خصوصًا، لا يُعثر على جزء كبير من الحساسيات المصرّح بها بعد الفحص عند أخصائي الحساسية. ولهذا يُستحسن السؤال عن التفاصيل بدل الاكتفاء بالعبارة.',
      },
      { type: 'h3', title: 'أسئلة مفيدة حين يصرّح المريض بحساسية' },
      {
        type: 'list',
        items: [
          '**تجاه أي مادة؟** الاسم الدقيق (أموكسيسيلين) أم العائلة فقط («المضادات الحيوية»)؟',
          '**أي تفاعل؟** شرى، تورّم، ضيق تنفس، إغماء، أم اضطراب هضمي بسيط؟',
          '**متى؟** بعد كم من الوقت من التناول، ومنذ كم سنة؟',
          '**هل هي مؤكدة؟** هل فحصه أخصائي الحساسية؟ وهل أُعيد الدواء دون مشكل؟',
        ],
      },
      { type: 'h3', title: 'وماذا عن الحساسية المتصالبة؟' },
      {
        type: 'paragraph',
        text: 'نتحدث عن حساسية متصالبة حين يتفاعل شخص لديه حساسية تجاه مادة مع مادة أخرى أيضًا، لأن الجسم يتعرّف على جزء مشترك في بنيتهما. ولا تُستنتج من اسم العائلة وحده: فهي تتعلق بالمواد المعنية ونوع التفاعل والشخص. ولهذا لا يستنتج DwaDZ أيًا منها: تقتصر الأداة على المكتوب (مادة الحساسية، أو الصنف الذي تسمّيه). والقرار يعود إلى المختص.',
      },

      { type: 'h2', title: '2. من أين تأتي الحساسيات: أنطولوجيا الأمراض البشرية' },
      {
        type: 'paragraph',
        text: 'الحساسيات المعروضة في DwaDZ مصدرها أنطولوجيا الأمراض البشرية (HDO أو DO)، وهي أنطولوجيا مفتوحة للأمراض. والأنطولوجيا قاموس منظَّم: لكل مفهوم فيها معرّف ثابت وتعريف وأصل («الحساسية تجاه الأموكسيسيلين» نوع من «الحساسية تجاه البيتا-لاكتام»، وهي نوع من «الحساسية الدوائية») ومراجع. وفي HDO ترتبط كل حساسية بعاملها المسبّب، المعرَّف بدوره في أنطولوجيا أخرى.',
      },
      {
        type: 'table',
        headers: ['العنصر', 'مثال', 'ما هو'],
        rows: [
          { cells: ['رمز HDO', 'DOID:0040004', 'معرّف الحساسية. يعرضه DwaDZ بالصيغة «HDO 0040004»، ولا يتغير حتى لو عُدّلت التسمية.'] },
          { cells: ['التسمية', 'amoxicillin allergy', 'الاسم الإنجليزي في HDO. ويقترح DwaDZ تسمية فرنسية مسودة: «Allergie — amoxicilline».'] },
          { cells: ['العامل المسبّب', 'CHEBI:2676 (amoxicillin)', 'ما يثير الحساسية: ChEBI للمواد الكيميائية، وFoodOn وNCBI Taxon للأغذية والكائنات الحية.'] },
          { cells: ['المراجع', 'PubMed', 'المنشورات التي تصف الحساسية، وتُذكر في بطاقة كل حساسية.'] },
        ],
      },
      { type: 'h3', title: 'ليست كل العوامل مواد دوائية' },
      {
        type: 'paragraph',
        text: 'يصف الاستخراج المعتمد من HDO ما مجموعه 122 حساسية. وعند فحصها واحدة واحدة يتبيّن أن كثيرًا منها لا علاقة له بدواء: حساسيات غذائية (التفاح، القمبري، السلمون…)، ومعادن (النيكل، الكوبالت، الكروم)، ومنتجات صناعية (الإيزوسيانات، الأنهيدريدات). ففُرزت بحسب ما يمكن فعله بها في DwaDZ.',
      },
      {
        type: 'table',
        headers: ['الفئة', 'الحساسيات', 'ما يفعله DwaDZ بها'],
        rows: [
          { cells: ['مادة دوائية أو صنف دوائي', '51', 'تُربط بالبطاقات: تبويب الحساسيات ومرشح البحث.'] },
          { cells: ['سواغات (الحليب، البيض، السمك، البقوليات، المواد الحافظة)', '7', 'تُعرض باهتة في البطاقة دون تقييم: فالمدونة لا تعطي تركيبة السواغات.'] },
          { cells: ['اللاتكس', '1', 'مادة السدادات والمحاقن: لا تتضمنها المدونة.'] },
          { cells: ['أغذية، معادن، كيمياء صناعية', '60', 'خارج النطاق.'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'تتوزع الحساسيات الـ122 هكذا: 51 + 7 + 1 + 60، مع استبعاد مستويين للتجميع («الحساسية الدوائية» و«الحساسية تجاه المعادن») وداء الرشاشيات الذي هو عدوى وليس حساسية. وهذه الأعداد هي أعداد الاستخراج وقت الدمج، وستتغير مع إصدارات HDO.',
      },

      { type: 'h2', title: '3. كيف تم العمل' },
      {
        type: 'paragraph',
        text: 'تتحدث حساسية HDO عن مادة بالإنجليزية («amoxicillin»)، بينما تتحدث المدونة الجزائرية عن الأسماء الدولية بالفرنسية («AMOXICILLINE»). فكان لا بد من جسر، وهو موجود في الموقع أصلًا: التصنيف ATC لمنظمة الصحة العالمية.',
      },
      {
        type: 'list',
        items: [
          '**1. الاستخراج**: لكل حساسية رمزها وتسميتها وتعريفها وعاملها المسبّب ومراجعها.',
          '**2. الفرز**: مادة دوائية، أو سواغ، أو لاتكس، أو خارج النطاق (انظر الجدول أعلاه). ورُصدت بعض الشوائب في المصدر وعُولجت: فقد ظهر «داء الرشاشيات» (عدوى فطرية وليست حساسية) في القائمة، وصُنّفت حساسية الميروبينيم ضمن أنواع الربو.',
          '**3. الربط بمادة أو بصنف عبر ATC**: يُقارن العامل المسبّب باسم مادة في ATC. وتُعرف الأسماء المتكافئة (سوكسينيل كولين = سوكساميثونيوم) والأملاح («بروميد الروكورونيوم»).',
          '**4. بيان طبيعة الرابط**، كما في مصطلحات EDQM الخاصة بالشكل الصيدلاني (انظر الجدول التالي).',
          '**5. عدم اختلاق شيء**: دون ربط مؤكد لا يُنشأ أي رابط. والربط المشكوك فيه يوسم «قيد التأكيد» بدل أن يُعرض كأنه مؤكد.',
          '**6. عدم استنتاج شيء**: لا حساسية متصالبة ولا نصيحة. ولا تُنقل إلى الموقع رموز SNOMED CT وUMLS الموجودة في الاستخراج، ريثما يُتحقق من ترخيصها.',
        ],
      },
      {
        type: 'table',
        headers: ['العلاقة', 'العلامة', 'المعنى', 'مثال'],
        rows: [
          { cells: ['مطابقة', '(لا علامة)', 'الحساسية خاصة بهذه المادة تحديدًا (الجزء الفعال نفسه، والملح لا يغيّر العلاقة).', 'HDO 0040004: أموكسيسيلين'] },
          { cells: ['صنف', '⊂', 'الحساسية خاصة بصنف، وتنطبق على كل المواد ضمن رموز ATC الخاصة به، وعليها وحدها.', 'HDO 0060520: البنسلينات (ATC J01C)'] },
          { cells: ['قريبة', '≈', 'أفضل ربط متاح، قيد التأكيد.', 'HDO 0040076: مجموعة الفتاليل ← فتاليل سلفاثيازول'] },
        ],
      },
      { type: 'h3', title: 'مثال: من الأموكسيسيلين إلى البيتا-لاكتام' },
      {
        type: 'paragraph',
        text: 'ترتبط بطاقة الأموكسيسيلين (ATC J01CA04) بثلاث حساسيات: الحساسية تجاه الأموكسيسيلين نفسه (علاقة مطابقة)، والحساسية تجاه البنسلينات (الصنف J01C)، والحساسية تجاه البيتا-لاكتام (الصنفان J01C وJ01D). وفي HDO ترتبط الأموكسيسيلين بالبيتا-لاكتام فقط؛ أما التسلسل الهرمي في ATC فيتيح الصعود إلى البنسلينات. وبالطريقة نفسها يصعد سيفالوسبورين (ATC J01DD04، سيفترياكسون) إلى الحساسية تجاه السيفالوسبورينات والبيتا-لاكتام، لا إلى حساسية البنسلينات.',
      },

      { type: 'h2', title: '4. في بطاقة الدواء' },
      {
        type: 'paragraph',
        text: 'إذا طابقت المادة الفعالة للدواء (أو صنفها) حساسية ما، تعرض البطاقة قسم «الحساسيات الموثّقة». ويظهر بجانب التداخلات، مع تبويبي «التداخلات» و«الحساسيات» حين يوجدان معًا، وزر «عرض الحساسيات (n)» في العمود الجانبي. والدواء المسحوب لا يعرض شيئًا منها.',
      },
      {
        type: 'table',
        headers: ['المستوى', 'ما نراه', 'مثال (أموكسيسيلين)'],
        rows: [
          { cells: ['1. هذه المادة', 'الحساسيات تجاه المادة الفعالة في البطاقة', 'HDO 0040004 · Allergie — amoxicilline · المادة نفسها'] },
          { cells: ['2. أصناف المادة', 'الحساسيات تجاه صنف تنتمي إليه، من الأدق إلى الأعم', 'HDO 0060520 ⊂ البنسلينات · HDO 0060519 ⊂ البيتا-لاكتام'] },
          { cells: ['3. السواغات (باهتة)', 'الحساسيات تجاه سواغات شائعة: للعلم فقط، دون تقييم', 'الحليب، البيض، المواد الحافظة…: راجع التركيبة في RCP'] },
        ],
      },
      {
        type: 'paragraph',
        text: 'الرمز الوردي أمام كل حساسية قابل للنقر: يفتح بطاقة الحساسية (انظر الفصل 6). وتذكّر العلامة ⊂ بأن الأمر يتعلق بصنف أوسع من مادة البطاقة.',
      },

      { type: 'h2', title: '5. في البحث: مرشح «حساسية معروفة»' },
      {
        type: 'list',
        items: [
          'افتح صفحة البحث (/recherche) واكتب ما تبحث عنه، مثلًا «amoxi».',
          'اضغط «🩺 حساسية معروفة»: تنفتح لوحة.',
          'اختر الحساسية من القائمة: الأصناف أولًا ثم المواد. ورمز HDO أمام كل تسمية.',
          'اختر الوضع: «تمييز» (الموصى به) أو «إخفاء».',
          'تتحدّث القائمة. ويذكّر شريط بالحساسية المختارة وبعدد العروض المميّزة أو المخفية، مع رابط إلى بطاقتها.',
          'لإزالة المرشح اضغط ✕ في الشريط.',
        ],
      },
      {
        type: 'paragraph',
        text: 'يبقى الاختيار قائمًا عند كتابة بحث آخر: فالحساسية معطى يخص المريض لا القائمة. وهو مكتوب في عنوان الصفحة (…?allergie=0060520&allergie_mode=signaler)، فيكفي نسخ الرابط لمشاركة العرض نفسه.',
      },
      {
        type: 'table',
        headers: ['الوضع', 'ما يحدث', 'متى نستعمله'],
        rows: [
          { cells: ['تمييز', 'تبقى كل النتائج، وتحمل المعنيّة منها شارة وردية «⚠ HDO … حساسية معروفة» مع المادة أو الصنف المعني.', 'في أغلب الحالات: ترى كل شيء ويبرز المعنيّ.'] },
          { cells: ['إخفاء', 'تُحذف النتائج المعنية من القائمة، ويحصي الشريط عددها.', 'لتخفيف قائمة طويلة. انتبه: الدواء المخفي لا يُرى، حتى حين نريد فحصه بالذات.'] },
        ],
      },
      { type: 'h3', title: 'ما الذي يميّزه كل اختيار وما الذي لا يميّزه' },
      {
        type: 'table',
        headers: ['الحساسية المختارة', 'يُميَّز', 'لا يُميَّز'],
        rows: [
          { cells: ['HDO 0040004: أموكسيسيلين', 'الأدوية المحتوية على الأموكسيسيلين، وحده أو مرتبطًا (أموكسيسيلين + حمض الكلافولانيك)', 'الأمبيسيلين وبقية البنسلينات'] },
          { cells: ['HDO 0060520 ⊂ البنسلينات', 'كل البنسلينات (ATC J01C): أموكسيسيلين، أمبيسيلين، بنزيل بنسلين…', 'السيفالوسبورينات (J01D)'] },
          { cells: ['HDO 0060519 ⊂ البيتا-لاكتام', 'البنسلينات (J01C) وبقية البيتا-لاكتام (J01D): السيفالوسبورينات، الكاربابينيمات، المونوباكتام', 'كل ما ليس من البيتا-لاكتام'] },
          { cells: ['HDO 0040070: كو-تريموكسازول', 'التركيبات سلفاميثوكسازول + تريميثوبريم', 'التريميثوبريم وحده'] },
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'جرّب: ابحث عن «cef» مع اختيار الحساسية تجاه البنسلينات. لن يُميَّز شيء للسيفترياكسون أو السيفيكسيم، لأنهما ليسا من البنسلينات، ولأن DwaDZ لا يستنتج حساسية متصالبة. ولتمييزهما اختر صنف «البيتا-لاكتام» (الذي يضم العائلتين) أو «السيفالوسبورينات»: فهذا اختيار المختص، تجعله الأداة ظاهرًا.',
      },

      { type: 'h2', title: '6. بطاقة الحساسية' },
      {
        type: 'paragraph',
        text: 'كل رمز HDO قابل للنقر: في بطاقة الدواء، وفي شريط البحث، وعلى شارات النتائج. وهو يقود إلى صفحة /allergies/<الرمز>، مثل /allergies/0060520 للبنسلينات. وتجد فيها: تعريف HDO، والعامل المسبّب (مع معرّف ChEBI ورابط إلى المصدر)، وطبيعة الربط ورموز ATC، وقائمة المواد الدولية في المدونة المعنية مع عدد عروضها، ثم المراجع (PubMed وغيره). ويهيّئ رابط «تمييز هذه الحساسية في البحث» بحثًا مضبوطًا مسبقًا.',
      },

      { type: 'h2', title: '7. الحدود التي يجب تذكّرها' },
      {
        type: 'list',
        items: [
          '**إحصاء جزئي.** تخص 51 حساسية مواد دوائية: هي مجموعة منتقاة من HDO، لا كل الحساسيات الممكنة.',
          '**معلومة وليست قرارًا.** لا يقول الموقع إن كان دواء آمنًا لمريض أم لا. بل يُبرز حساسية موثّقة.',
          '**ربط آلي.** يعتمد على اسم المادة وعلى ATC. فمثلًا لا تُميَّز التركيبات موسِّع قصبي + كورتيكوستيرويد (رمزا ATC R03AK وR03AL) للحساسية تجاه الكورتيكوستيرويدات، لأن رموزها تخلط منتجات تحتوي الكورتيكوستيرويد وأخرى لا تحتويه.',
          '**سواغات غير مقيَّمة.** تعطي المدونة المادة الفعالة لا التركيبة الكاملة. وتُقرأ التركيبة في RCP.',
          '**تسميات مسودة.** الفرنسية قيد المراجعة؛ وأسماء الحساسيات بالعربية تظهر بالفرنسية مع تنبيه ريثما تتم الترجمة.',
          '**إصدار HDO.** للمعطيات تاريخ الاستخراج المعتمد، وستُحدَّث مع إصدارات المصدر.',
        ],
      },

      { type: 'h2', title: '8. للمراجعة (الطلبة)' },
      {
        type: 'qcm',
        questions: [
          {
            question: 'مريض يعاني اضطرابات هضمية مع الميتفورمين. عمّ نتحدث على الأرجح؟',
            options: [
              { label: 'A', text: 'عن حساسية: فقد تفاعل الجهاز المناعي.' },
              { label: 'B', text: 'عن أثر غير مرغوب فيه أو عدم تحمّل، دون آلية مناعية.' },
              { label: 'C', text: 'عن حساسية متصالبة.' },
            ],
            answer: 'B',
          },
          {
            question: 'في DwaDZ اخترنا حساسية «أموكسيسيلين» وبحثنا عن «ampi». ماذا يحدث للأمبيسيلين؟',
            options: [
              { label: 'A', text: 'يُميَّز لأنه من البنسلينات.' },
              { label: 'B', text: 'لا يُميَّز: فالأداة لا تستنتج حساسية متصالبة.' },
              { label: 'C', text: 'يُخفى تلقائيًا.' },
            ],
            answer: 'B',
          },
          {
            question: 'ماذا تعني العلامة ⊂ بعد رمز HDO؟',
            options: [
              { label: 'A', text: 'الحساسية خاصة بصنف أوسع من مادة البطاقة.' },
              { label: 'B', text: 'الحساسية مؤكدة من أخصائي الحساسية.' },
              { label: 'C', text: 'الربط قيد التأكيد.' },
            ],
            answer: 'A',
          },
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'هل من خطأ أو اقتراح؟ راسلنا عبر صفحة «اتصل بنا» (/contact) مع ذكر الدواء أو رمز HDO المعني. المصدر: أنطولوجيا الأمراض البشرية. يصف هذا المقال أداة إعلامية، ولا يغني عن ملخص خصائص المنتج ولا عن الوصفة ولا عن رأي الطبيب أو الصيدلي.',
      },
    ],
  },
]
