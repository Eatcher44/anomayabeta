# Sécuriser les transferts, photos et suppressions sans publier

## Situation vérifiée
- Sauvegarde la plus récente confirmée par vous : **18 octobre 2026 à 03:17:46 UTC**. Elle ne couvre pas les photos.
- Le confinement reste actif : réclamations et écritures directes de codes interdites, suppression automatique suspendue, remplacement/suppression directe de photos interdits.
- Les **58 photos principales** actuelles correspondent toutes à un fichier existant dans le dossier de leur propriétaire ; aucune URL principale partagée ou étrangère détectée.
- Aucun code, aucune archive, aucun logo ni aucune signature actuellement enregistré. La galerie apparaît dans les écrans mais son champ n’existe pas dans les données actuelles.

## Ce qui sera construit

### 1. Transferts par code, avec autorisation serveur
- Garder « Générer un code » et « Entrer un code », sans imposer de recherche d’adresse email ni de nouveau parcours d’identification.
- Créer les codes uniquement après vérification du propriétaire connecté. L’expéditeur ne pourra pas être déclaré ou modifié par le téléphone.
- Utiliser un code serveur cryptographiquement aléatoire plus long, copier-coller compatible. Le code donnera explicitement le droit de réception à son détenteur connecté ; il ne prétendra pas identifier un destinataire nommé.
- Consommer le code et transférer le dossier dans une transaction unique : validation, expiration, archive, changement de propriétaire et invalidation des autres codes.
- Interdire les modifications directes des codes et la fabrication d’archives par les clients.
- Limiter les créations et essais côté serveur avec des compteurs durables, y compris lors d’appels directs. Proposition initiale à tester : 10 créations par compte et par heure, 20 essais par compte sur 15 minutes. Les essais sont comptés avant validation afin de ne pas annuler le compteur avec un échec.

### 2. Photos : propriété fiable sans casser les URL existantes
- Ajouter un registre serveur des fichiers et de leurs rattachements ; ne jamais considérer une URL modifiable comme preuve d’autorisation.
- Reprendre les rattachements des 58 photos uniquement après validation du stockage et du propriétaire. Toute référence ambiguë restera sans droit de suppression et sera signalée.
- Conserver les chemins et lectures publiques existants pendant cette étape ; ne déplacer ni supprimer aucune photo de production.
- Autoriser les nouveaux rattachements seulement lorsque le fichier appartient réellement au déposant ou qu’un transfert serveur lui a accordé l’usage.
- Mettre à jour les droits lors d’un transfert : le cédant ne peut plus modifier ni supprimer le fichier actif. Son archive reste en lecture seule selon une référence explicite.
- Couvrir photos principales, nouvelles galeries, logos, signatures et archives ; préparer une séparation ultérieure des signatures privées sans bascule brutale du stockage actuel.
- Conserver le blocage des remplacements/destructions directs pendant la transition ; les suppressions passent par un contrôle serveur des références fiables.

### 3. Suppression de compte coordonnée avec les transferts
- Enregistrer un état durable de suppression et bloquer immédiatement les nouvelles écritures et transferts impliquant ce compte.
- Partager un ordre de verrouillage commun entre transfert, rattachement et préparation de suppression.
- Faire supprimer par la fonction de suppression uniquement les fichiers dont le registre prouve l’autorisation et l’absence d’usage par un autre compte.
- Faire échouer le nettoyage de manière sûre si une vérification échoue. Prévoir interruptions et reprises sans supprimer deux fois ni perdre une photo transférée.
- Garder la suppression du compte de connexion en dernier. Ajouter les nouvelles données de sécurité au nettoyage.

### 4. Tests et réouverture contrôlée
- Tests isolés puis comptes jetables : expéditeur falsifié, animal étranger, modification directe, code absent/expiré/utilisé, deux réclamations du même code et de codes différents.
- Tester les limites avec appels parallèles et échecs, sans contourner les compteurs.
- Tester fichiers étrangers, ancien propriétaire, galerie, signature, archive, suppression dans les deux ordres, transfert concurrent avec suppression, interruption et reprise.
- Vérifier les profils et PDF avec photos ainsi que les dossiers de soins anciens.
- Comparer les empreintes des comptes, de toutes les tables applicatives et des fichiers de production avant/après ; nettoyer seulement les données jetables.
- Refaire les scans de sécurité et dépendances ; documenter les alertes restantes.
- Ne réactiver que la version corrigée après réussite des tests. **Aucune publication des écrans sans votre accord distinct.**

## Risques nécessitant cet accord
- Cette transition ajoute des règles serveur sur les rattachements de photos et sur les écritures pendant une suppression. Un ancien écran envoyant une URL non autorisée sera refusé ; un ancien écran créant directement un code restera bloqué.
- La reprise des références existantes sera validée avant attribution de droits. Aucun fichier ni dossier réel ne sera supprimé pour « réparer » une incohérence.
- L’ancien écran limité aux codes de huit caractères ne pourra pas saisir un code plus long : la réouverture publique de ce parcours nécessitera une publication ultérieure autorisée. Aucun raccourcissement silencieux des nouveaux codes ne contournera ce problème.
- Le partage par code autorise son détenteur connecté, pas une personne désignée. Si un destinataire nommé devient obligatoire, cette évolution fera l’objet d’une demande distincte.
- Ni la sauvegarde ni l’export ne couvrent les fichiers ; aucune restauration ne sera lancée. Les URL publiques connues restent publiques pendant cette phase.

## Détails techniques
- Migrations additives uniquement, avec privilèges explicites et RLS sur toutes les nouvelles tables ; aucune suppression ou modification de type des colonnes existantes.
- Registre de médias et rattachements protégés contre l’écriture cliente, compteurs durables, état de suppression et journal de nettoyage réessayable.
- Création et réclamation serveur paramétrées, identité issue de la session ; aucune décision d’autorisation fondée sur le stockage local du téléphone.
- Verrouillage déterministe des comptes et animaux, puis des codes ; revalidation sous verrou. Aucun verrou de transaction maintenu pendant un appel réseau au stockage.
- Les erreurs attendues de codes retournent un résultat contrôlé pour préserver l’incrément des compteurs ; les opérations sensibles restent transactionnelles.
- Contraintes et déclencheurs ne touchent pas aux tables gérées de connexion ou de stockage ; seuls les contrôles autorisés de stockage évoluent.
- Les dépendances critiques/élevées ont été actualisées dans le projet non publié ; deux alertes modérées de navigation restent à examiner, sans imposer une migration majeure non testée.

## Critère de sortie
Un seul propriétaire après chaque transfert, aucun droit de mutation pour l’ancien propriétaire, aucune suppression de fichier basée sur une URL arbitraire, aucun transfert possible pendant une suppression, tests réels passés et données originales inchangées. Sinon, maintien du confinement et **NOT READY TO PUBLISH**.