# Checklist Android — version non publiée (navigateur Chrome du téléphone)

Compte de test uniquement (adresse dédiée, ex. `prenom+test1@...`). Deux comptes : A et B.
L'application Google Play (TWA) affiche la version publiée : elle ne peut PAS tester cette version avant publication.

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ma famille : animal avec photo privée | photo visible, pas d'image cassée |
| 2 | Fiche animal | photo visible ; après rechargement toujours visible |
| 3 | Créer un animal → Galerie → choisir une photo → Créer | animal créé avec photo |
| 4 | Créer un animal → Appareil photo → prendre une photo → Créer | idem |
| 5 | Appareil photo → refuser l'autorisation | message clair, formulaire conservé, rien créé |
| 6 | Appareil photo/galerie → bouton Retour Android ou Annuler | rien créé, formulaire conservé |
| 7 | Remplacer la photo d'une fiche | nouvelle photo visible après rechargement |
| 8 | Mettre Chrome en arrière-plan 6 min, revenir | photos se réaffichent seules |
| 9 | Mode avion pendant un envoi | erreur claire, ancienne photo conservée ; réessai OK après retour réseau |
| 10 | Réseau lent (4G faible) | photos finissent par s'afficher ou image neutre, jamais d'erreur bloquante |
| 11 | Se déconnecter, se connecter avec B | aucune photo de A visible |
| 12 | Avec B, coller le lien d'une photo privée de A (copié depuis A via « ouvrir l'image ») | refusé / image neutre |

Noter pour chaque ligne : OK / KO + capture d'écran si KO.
Après publication approuvée seulement : refaire 1-2, 3-6 et 8 dans l'application Google Play.
