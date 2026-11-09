# Ép. 18 — التنبيهات: الأدوية المسحوبة وأسباب السحب والسنوات (Alertes : médicaments retirés, motifs et années)

- **Durée** : 60 s · **Langue** : arabe standard (voix clonée, eleven_v3 + lexique complet), traduction française en sous-titre
- **Lien cliquable** : https://www.dzair-pharma.net/alertes (bouton site + légende Facebook ; l'adresse est affichée en fin de vidéo)
- **Relu par** : ________ · **Date** : ________

## Script de voix (texte exactement lu)

| Temps | Voix (arabe standard) | Sous-titre FR |
|---|---|---|
| 0:00–0:05 | هل دواؤك مسحوب من السوق؟ تعرف على التنبيهات في DwaDZ | Ton médicament est-il retiré du marché ? Découvre les alertes sur DwaDZ |
| 0:05–0:11 | صفحة التنبيهات تعرض الأدوية المسحوبة، من الأحدث إلى الأقدم | La page Alertes liste les médicaments retirés, du plus récent au plus ancien |
| 0:11–0:18 | وفي كل بطاقة: اسم الدواء والمادة الفعالة، والمخبر، وسبب السحب وتاريخه | Chaque fiche : nom, substance active, laboratoire, motif du retrait et date |
| 0:18–0:26 | وهذه أكثر الأسباب شيوعا: منع الاستيراد من وزارة الصحة، ثم الأسباب التجارية | Motifs les plus fréquents : interdiction d'importation par le ministère, puis motifs commerciaux |
| 0:26–0:32 | ومنها أيضا: منتج غير مسوّق وقرار تسجيل غير مجدد | Aussi : produit non commercialisé et décision d'enregistrement non renouvelée |
| 0:32–0:36 | وليس كل سحب مرتبطا بسلامة الدواء | Un retrait n'est pas forcément lié à la sécurité du médicament |
| 0:36–0:43 | وللبحث: اختر السنة أو السبب، أو اكتب اسم الدواء أو المادة الفعالة | Pour chercher : choisis l'année ou le motif, ou tape un nom ou une DCI |
| 0:43–0:49 | لا تصرف أي دواء من هذه القائمة، وعند الشك راجع المصادر الرسمية | Ne délivre aucun médicament de cette liste ; en cas de doute, consulte les sources officielles |
| 0:49–0:55 | تصفح التنبيهات الآن على DwaDZ. الرابط في وصف الفيديو | Consulte les alertes sur DwaDZ. Lien dans la description |
| 0:55–1:00 | معلومة عامة، ولا تغني عن رأي الطبيب أو الصيدلي | Information générale : elle ne remplace pas l'avis du médecin ou du pharmacien |

## Génération de la voix (dans ton terminal)

```bash
export ELEVENLABS_API_KEY=ta_clé
./generer_voix.sh alertes
```

Résultat : `out/alertes.clone.mp4`. Les noms de médicaments sont écrits en lettres latines dans la voix pour que le P soit prononcé.

