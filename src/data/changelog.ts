export interface ChangelogVersion {
  version: string;
  title: string;
  date: string; // ISO date
  intro: string;
  ajouts: string[];
  modifications: string[];
  bugs: string[];
}

export const CURRENT_CHANGELOG_VERSION = '0.3';
export const CHANGELOG_STORAGE_KEY = 'anomaya_last_seen_version';

export const CHANGELOG: ChangelogVersion[] = [
  {
    version: '0.3',
    title: 'Ajout de la pharmacie',
    date: '2026-05-16',
    intro:
      'Cette mise à jour ajoute une pharmacie pour mieux suivre les produits, médicaments et traitements disponibles à la maison.',
    ajouts: [
      'Ajout d’une nouvelle section Pharmacie accessible à tous les utilisateurs',
      'Ajout du suivi des quantités restantes pour les médicaments et traitements',
      'Ajout de la possibilité de lier un traitement donné à un produit de la pharmacie',
      'Ajout de l’ajustement manuel du stock',
      'Ajout d’indications visuelles pour les stocks faibles ou expirés',
    ],
    modifications: [
      'Le suivi des traitements devient plus pratique grâce à la déduction automatique des doses utilisées',
      'Le Tableau de bord santé donne maintenant accès plus rapidement à la Pharmacie',
      'Les liens vers les parents d’un bébé sont maintenant plus complets lorsqu’une mère et un père sont renseignés',
    ],
    bugs: [
      'Correction de l’affichage des produits donnés depuis la Pharmacie dans l’historique de soins de l’animal',
      'Correction de l’accès au profil du père depuis la fiche d’un bébé lorsque le père est renseigné',
    ],
  },
  {
    version: '0.2.5',
    title: 'Amélioration de l’identité visuelle',
    date: '2026-05-16',
    intro:
      "Cette mise à jour améliore l’apparence d’Anomaya au lancement de l’application, avec une nouvelle icône et un écran de chargement plus soigné.",
    ajouts: [
      'Ajout d’une nouvelle icône Anomaya plus élégante',
      'Ajout d’un nouvel écran de chargement plus premium au lancement de l’application',
      'Ajout d’un visuel de démarrage plus cohérent avec l’univers Anomaya',
    ],
    modifications: [
      'Amélioration de l’identité visuelle d’Anomaya au démarrage de l’application',
      'Meilleure cohérence entre l’icône, l’écran de chargement et l’ambiance générale de l’application',
      'L’écran de chargement reste visible suffisamment longtemps pour offrir une transition plus propre',
    ],
    bugs: [
      'Aucun correctif majeur dans cette version',
    ],
  },
  {
    version: '0.2',
    title: "Préparation des accès d'abonnement",
    date: '2026-05-08',
    intro:
      "Cette mise à jour prépare la future organisation des accès Anomaya, sans paiement réel pour le moment. L’objectif est de vérifier que les données restent bien conservées lorsque l’accès au Pack Éleveur change.",
    ajouts: [
      'Ajout d’une logique de plans Gratuit, Sans pub et Pack Éleveur',
      'Ajout d’un outil de test bêta pour simuler les différents accès',
      'Ajout d’un écran de verrouillage clair pour les fonctionnalités éleveur',
    ],
    modifications: [
      'Les données d’élevage sont conservées même lorsque l’accès au Pack Éleveur est désactivé',
      'L’écran Anomaya+ présente les futurs packs sans paiement réel pendant la bêta',
      'Préparation de la logique qui permettra plus tard de gérer les pubs et les abonnements',
      'Les raccourcis liés au Pack Éleveur affichent désormais plus clairement leur accès Pro',
      'Les cartes des bébés dans une portée utilisent désormais le même accès au profil que les animaux de Ma famille',
    ],
    bugs: [
      'Correction du délai d’ouverture de la page Anomaya+ depuis certains accès verrouillés',
      'Correction de l’accès au profil des bébés depuis les cartes d’une portée',
    ],
  },
  {
    version: '0.1.5',
    title: 'Correction du suivi de gestation',
    date: '2026-05-06',
    intro:
      'Cette petite mise à jour corrige un problème important dans le suivi des saillies et des gestations.',
    ajouts: [
      'Aucun ajout majeur dans cette version',
    ],
    modifications: [
      'Le suivi de gestation distingue mieux la saillie confirmée et la mise bas réellement effectuée',
    ],
    bugs: [
      'Correction d’un bug où confirmer une saillie pouvait valider la mise bas trop tôt',
      'Correction de la disparition du compteur de gestation après confirmation d’une saillie',
      'Le compteur de jours de gestation reste visible jusqu’à la confirmation réelle de la mise bas',
    ],
  },
  {
    version: '0.1',
    title: 'Premières améliorations de la bêta',
    date: '2026-05-05',
    intro:
      "Merci pour les premiers retours envoyés depuis le lancement de la bêta. Cette mise à jour corrige plusieurs points importants et prépare les prochaines étapes d'Anomaya.",
    ajouts: [
      'Ajout d’un historique des mises à jour dans les paramètres',
      'Ajout d’un écran de nouveautés au premier lancement après une mise à jour',
      'Ajout de l’âge des petits directement dans les informations de la portée',
      'Ajout de l’heure de naissance pour calculer plus précisément l’âge des petits',
      'Ajout d’un affichage plus clair de la couleur de distinction des bébés dans les portées',
      'Préparation d’une meilleure intégration Android pour l’application installée',
      'Ajout d’une logique plus souple pour les vaccins et leurs rappels',
    ],
    modifications: [
      'Les vaccins sont maintenant optionnels par défaut',
      'Les rappels de vaccins peuvent être configurés selon les besoins de chaque animal',
      'Les animaux castrés ou stérilisés ne sont plus proposés comme reproducteurs actifs',
      'Le bouton Guide a été déplacé pour laisser plus de place au titre « Ma famille »',
      'L’affichage de l’écran Ma famille a été ajusté pour mieux s’adapter aux petits écrans',
      'La couleur de distinction est désormais affichée uniquement dans les portées, afin de mieux correspondre à l’usage des bracelets ou repères de couleur pour les bébés',
      'L’âge des petits est calculé à partir de la date et de l’heure de naissance',
      'L’affichage de l’âge est adapté automatiquement en jours, semaines et mois',
      'Préparation de la future gestion du Pack Éleveur après la bêta',
    ],
    bugs: [
      'Correction du décalage de date qui pouvait afficher la veille pour une saillie ou une mise bas',
      'Correction des alertes de vaccins obligatoires affichées par défaut',
      'Correction de l’affichage des animaux castrés ou stérilisés dans les reproducteurs actifs',
      'Correction de plusieurs détails d’affichage dans l’écran Ma famille et dans les portées',
      'Correction de plusieurs incohérences d’affichage sur mobile et tablette',
      'Correction de la saisie du nombre de petits sur mobile, qui empêchait de remplacer facilement la valeur par défaut',
    ],
  },
  {
    version: '0.0',
    title: 'Lancement de la bêta privée',
    date: '2026-04-28',
    intro:
      "Merci à toutes les personnes qui participent aux premiers tests d'Anomaya. Cette bêta sert à construire une application vraiment utile pour les éleveurs et les propriétaires d'animaux, avec vos retours au centre des améliorations.",
    ajouts: [
      'Ouverture de la bêta privée d’Anomaya',
      'Accès complet aux outils éleveur pendant la période de test',
      'Gestion des animaux, des portées, des soins, du poids et des rappels',
      'Ajout d’un guide pour aider à prendre l’application en main plus facilement',
    ],
    modifications: [
      'Première version adaptée aux retours des éleveurs testeurs',
      'Mise en place d’une interface simple pour suivre les animaux au quotidien',
    ],
    bugs: [
      'Corrections de stabilité avant l’ouverture de la bêta',
      'Ajustements sur les premiers écrans de configuration',
    ],
  },
];

/** Compare versions like "0.1" > "0.0". Simple semver-lite. */
export function isVersionNewer(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}
