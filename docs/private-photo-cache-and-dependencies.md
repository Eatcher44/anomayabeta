# ANOMAYA — Cache privé et dépendances

19 octobre 2026 — rapport ciblé, pas de nouvel audit général.

## 1. Cache privé corrigé : OUI

Le cache et l'affichage sont liés à une génération d'identité. Déconnexion ou changement de compte invalident le cache et les résultats déjà affichés. Les réponses initiales et les réponses de renouvellement devenues anciennes ne peuvent ni remplir le cache ni remettre une photo à l'écran. Une requête HTTP peut finir : son résultat est invalidé, pas nécessairement son transport annulé.

Les références enregistrées ne changent pas. Les liens temporaires restent en mémoire, jamais dans les données persistantes. Aucun retour vers un lien public pour une référence privée, même malformée. Le renouvellement autorisé après erreur d'expiration reste limité à une tentative.

**Limite distincte :** vider le cache ne révoque pas un lien déjà délivré. Celui-ci reste une capacité de lecture jusqu'à expiration (5 minutes ici). Un tiers qui possède ce lien peut l'utiliser pendant cette durée. Ce n'est pas une nouvelle autorisation accordée au compte B.

## 2. Tests

- **Navigateur réel + service réel : 12/12 réussis**, dans le même navigateur : photo sur Ma famille ; retrait après déconnexion ; refus pour B ; ancien lien encore valide avant expiration ; refus après rechargement sous B ; retour autorisé sous A ; réponse de signature réellement obtenue du serveur puis retardée à la frontière HTTP et relâchée sous B, sans réapparition ; retour sous A ; ancien lien réellement refusé après 306 secondes ; renouvellement autorisé ; changement de compte après expiration ; reconnexion finale de A.
- Le test maintient aussi le véritable affichage photo monté pendant les transitions, afin qu'une disparition de page ne masque pas un cache défectueux. Ce montage supplémentaire est uniquement dans le navigateur de test, pas livré dans l'application.
- **Deux autres comptes :** nouvelle signature du fichier de A refusée pour chacun.
- **Tests automatisés locaux : 70/70**, dont 9 sur les photos privées ; 3 tests du PDF différé non exécutés. Tests de retard/reprise du renouvellement supplémentaires simulés.
- Compilation automatique : `build OK`. Diagnostics TypeScript automatiques : fichiers de diagnostic actualisés, aucune erreur sémantique enregistrée. Aucune compilation ou vérification de types manuelle lancée.
- Les premières exécutions du script navigateur ont rencontré des erreurs de montage/attente et une vérification trop précoce du lien renouvelé ; la dernière exécution corrigée donne 12/12, sans changement destiné à masquer un échec applicatif.
- Non exécuté ici : Google Play/TWA installé, nouveau test physique Android, nouvel audit global, preuve de commit tardif Storage. Les 8/8 Android Chrome précédents restent une preuve utilisateur séparée.

## 3. Dépendances : corrigées partiellement et classées

Les anciens verrous npm ne correspondaient pas aux versions déclarées. Le verrou npm a été régénéré sans installer ni exécuter de scripts ; Bun utilise son verrou texte actualisé. Pas de migration majeure forcée.

Correctifs ciblés installés :

| Bibliothèque | Version retenue | Usage |
|---|---:|---|
| flatted | 3.4.2 | outils de développement |
| form-data | 4.0.6 | tests jsdom |
| glob | 10.5.0 | parcours de fichiers/outils |
| js-yaml | 4.3.2 | outils de développement |
| nanoid | 3.3.18 | chaîne de compilation CSS |
| source-map-js | 1.2.2 | compilation CSS |
| browserslist | 4.29.4 | compilation |
| postcss | 8.5.23 | compilation CSS, y compris dépendances indirectes |
| yaml | 2.8.3 | outils de compilation |
| Vitest | 3.2.7 | tests ; ne corrige pas toutes ses alertes |

Vite reste en 5.4.21. Les avis encore présents ne sont **pas** déclarés résolus :

- **Tinypool 1.1.1 — critique** : pollution de prototype pouvant atteindre les options de workers, deux avis GHSA-5gmw-xhrv-c9v3 et GHSA-85c8-ppgw-ccpr. Correction commune en 2.1.2+. Vitest 3 attend `^1.1.1` : remplacer arbitrairement par 2.x serait une migration majeure indirecte non validée. Exploitation conditionnelle à la pollution de prototype dans le processus de tests ; pas d'exploitation démontrée par les utilisateurs de l'app.
- **Vite 5.4.21 — élevé**, GHSA-fx2h-pf6j-xcff : serveur de développement, correction de branche documentée en 6.4.3+. Le domaine vulnérable `<=6.4.2` inclut bien Vite 5. Mise à niveau majeure à valider séparément ; pas de serveur Vite dans l'app statique publiée.
- **braces 3.0.3 — élevé**, GHSA-vfj7-8cjw-p6xm : épuisement de pile sur motifs profondément imbriqués ; aucune version corrigée publiée identifiée.
- **brace-expansion, minimatch, picomatch — élevés** : versions indirectes anciennes encore présentes ; corrections compatibles par branche disponibles (1.1.21/2.1.7 ; 3.1.4+/9.0.7+ ; 2.3.2/4.0.4+). Leur résolution ciblée par parent reste à valider ; pas d'ajout de nouveaux paquets directs ni de remplacement global par une majeure.
- **Vitest/@vitest/mocker — modéré** : traversée de chemin dans les redirections de mocks ; correction documentée en 4.1.11+, pas par la mise à jour 3.2.7.
- **React Router 6.30.6 — modéré** : présent dans l'application via BrowserRouter ; les deux avis concernent des chemins serveur/hydratation/redirection absents de cette app purement cliente. Pas d'applicabilité démontrée ici ; conservé plutôt qu'une migration automatique en 7.
- Autres avis modérés/faibles : esbuild, ajv, humanfs, once, postcss-selector-parser ; consignés par le contrôle ciblé des dépendances, sans déclaration de correction globale.

**Ce qui arrive au navigateur :** React, React DOM, React Router et les bibliothèques importées par l'application. Les outils Vite/Vitest/Tinypool et les parseurs de motifs précités ne sont pas importés par le code applicatif ; ils servent la compilation, l'analyse ou les tests. L'analyse npm `omit=dev` affiche aussi des alertes élevées dans la chaîne Tailwind à cause du classement de dépendances, ce qui n'est pas une preuve de présence dans le JavaScript livré. Aucun fichier de compilation de production accessible n'a été inspecté indépendamment : la composition exacte de l'ancien artefact publié reste non vérifiée.

## 4. Risques restants et chemin de publication

**NOT READY TO PUBLISH.** La première publication compatible est techniquement envisageable avant fermeture des anciens dépôts, mais n'est pas autorisée par la règle actuelle tant que des risques critiques/élevés restent non résolus.

- **Préexistants en production :** photos historiques publiques ; anciens droits de dépôt ; possibilité de dépôt ancien non suivi ; clients et caches publiés non vérifiés. La nouvelle version ne ferme pas ces accès et ne garantit pas la fin de requêtes déjà autorisées.
- **Candidat corrigé :** risque de réaffichage intercompte par réponse tardive du cache supprimé dans les essais ciblés. Pas de modification d'authentification, de règles d'accès, de références photo existantes ou d'activation globale.
- **Environnement de développement :** alertes critiques/élevées restantes ci-dessus, sans preuve d'exploitation par les utilisateurs de l'app publiée.

Séquence proposée, **aucune étape exécutée ni approuvée automatiquement** :

1. Valider dans un environnement isolé une combinaison corrigée Vite/Vitest/Tinypool ; résoudre ou remplacer les parseurs vulnérables sans casser les tests et la compilation. Relancer le contrôle ciblé des dépendances.
2. Fournir la preuve instrumentée requise sur le dépôt tardif et préciser le plan de traitement des fichiers historiques/incertains. Pas de délai arbitraire utilisé comme preuve.
3. Décider explicitement du traitement du risque public historique avant le feu vert. Publier seulement après le contrôle obligatoire et un accord distinct. Si une publication intermédiaire malgré ces risques était souhaitée, elle nécessiterait une modification explicite de la règle de blocage : elle n'est pas autorisée aujourd'hui.
4. Publier le frontal compatible en maintenant transferts/suppression/photos privées globales désactivés. Vérifier Chrome et TWA/Google Play installée, anciennes versions et caches ; prévoir un retour au frontal compatible, sans réouvrir les droits supprimés.
5. Après accord séparé, retirer seulement les anciens droits de dépôt ; maintenir les lectures existantes tant que la migration n'est pas validée. La mesure d'adoption et un délai ne suffisent pas à démontrer la fin d'un ancien commit.
6. Réconcilier les écritures anciennes selon des preuves observables et le protocole instrumenté ; préserver les fichiers incertains. Migrer les photos seulement après accord, contrôle des liens et partage explicite ; vérifier sauvegarde et retour arrière avant de fermer leurs accès publics.
7. Réactiver séparément suppression/transferts uniquement après leurs tests réels et leur accord propre. Aucun déblocage fondé seulement sur une attente d'une heure ou de sept jours.

**Prochaine action exacte :** obtenir l'accord pour une validation isolée des mises à niveau majeures contrôlées des outils, pas pour publier. La préparation du protocole instrumenté et les décisions de fermeture/migration restent distinctes.

## 5. Données d'origine préservées : OUI

Avant/après concordants : 74 comptes originaux, 136 animaux, 69 fichiers historiques. Empreintes identiques pour les identifiants des comptes, toutes les lignes animales et les métadonnées Storage ; aucun fichier historique écrit ou déplacé. Pas de nouveau hachage du contenu binaire de chaque fichier.

Les trois comptes créés ici et leur photo ont été nettoyés par leur fonction de suppression authentifiée après autorisation de test limitée. Aucune identité jetable de cet essai restante. Liste commune de test vide ; seuls le compte Android conservé et son autorisation photo indépendante restent. Les trois drapeaux globaux restent faux.

Avant toute publication : relancer cache/session/retard/expiration, accès propriétaire/autre compte/anonyme, dépôts, transferts/suppression et confidentialité médicale, dépendances, intégrité des données et contrôle de sécurité obligatoire. Rien publié, migré, réactivé ni retiré aux anciens clients.