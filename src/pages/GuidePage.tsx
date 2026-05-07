import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PawPrint, Edit, Baby, CalendarPlus, Heart, ClipboardList, Building2, Utensils, Palette, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const GUIDE_SECTIONS = [
  {
    id: 'add-animal',
    icon: PawPrint,
    title: 'Ajouter un animal',
    description: 'Créez le profil de votre animal en quelques étapes.',
    steps: [
      'Sur l\'écran d\'accueil, appuyez sur "Ajouter un animal".',
      'Choisissez "Ajouter mon animal" ou "Transférer d\'un éleveur".',
      'Renseignez le nom, l\'espèce, le sexe, la race et la date de naissance.',
      'Ajoutez une photo (optionnel).',
      'L\'animal apparaît dans votre liste !',
    ],
  },
  {
    id: 'edit-animal',
    icon: Edit,
    title: 'Modifier les informations',
    description: 'Mettez à jour le profil de votre animal à tout moment.',
    steps: [
      'Appuyez sur un animal dans votre liste pour ouvrir son profil.',
      'Modifiez les champs souhaités : nom, photo, race, couleur, puce…',
      'Les modifications sont enregistrées automatiquement.',
    ],
  },
  {
    id: 'litters',
    icon: Baby,
    title: 'Suivre une portée',
    description: 'Enregistrez et suivez les portées de vos reproductrices.',
    steps: [
      'Allez dans l\'onglet "Élevage" en bas de l\'écran.',
      'Dans la section "Gestations & Saillies", créez une reproduction.',
      'Sélectionnez la mère et le père.',
      'Confirmer une saillie lance le suivi de gestation : le compteur de jours (X/63) reste visible.',
      'La mise bas doit être confirmée séparément, une fois la naissance réellement effectuée.',
      'Une fois la mise bas confirmée, créez la portée et ajoutez les petits.',
      'Suivez chaque chaton/chiot depuis la fiche de la portée.',
    ],
  },
  {
    id: 'feeding',
    icon: Utensils,
    title: 'Suivi des repas (biberons)',
    description: 'Suivez l\'alimentation de chaque nouveau-né au biberon.',
    steps: [
      'Ouvrez le profil d\'un nouveau-né depuis la portée.',
      'La section "Repas" apparaît sous le suivi du poids.',
      'Appuyez sur "Ajouter" pour enregistrer un repas.',
      'Renseignez la date, l\'heure, la quantité en mL et une note optionnelle.',
      'Le total sur 24h se calcule automatiquement.',
      'Vous pouvez modifier ou supprimer chaque entrée.',
      'Le dernier repas est affiché directement sur la carte du chaton dans la portée.',
    ],
  },
  {
    id: 'color-identification',
    icon: Palette,
    title: 'Identifier par couleur',
    description: 'Repérez vos animaux par couleur dans les listes.',
    steps: [
      'Ouvrez le profil d\'un animal et cliquez sur "Modifier".',
      'Renseignez le champ "Couleur / Robe" (ex : Bleu, Roux, Crème).',
      'Pour les bébés d\'une portée, vous pouvez aussi définir une distinction couleur (bracelet) qui colore le contour de leur carte dans la portée.',
      'La distinction couleur n\'apparaît que dans les portées, pas sur les cartes de Ma famille.',
      'Format affiché : "Race couleur particularité" (ex : Maine Coon bleu polydactile).',
    ],
  },
  {
    id: 'weight-tracking',
    icon: Scale,
    title: 'Suivi du poids',
    description: 'Le suivi du poids est maintenant plus accessible.',
    steps: [
      'Ouvrez le profil de n\'importe quel animal.',
      'La section "Suivi du poids" se trouve juste après la fiche, avant les soins.',
      'Appuyez sur "Gérer le poids" pour ajouter ou consulter les pesées.',
      'Pour les chatons, pesez régulièrement pour suivre la croissance.',
    ],
  },
  {
    id: 'health-event',
    icon: CalendarPlus,
    title: 'Ajouter un événement santé',
    description: 'Vaccins, vermifuges, consultations… tout est centralisé.',
    steps: [
      'Ouvrez le profil de l\'animal concerné.',
      'Choisissez le type de soin : vaccin, vermifuge, anti-parasitaire ou consultation.',
      'Renseignez la date et les détails.',
      'Activez un rappel si vous le souhaitez.',
      'Retrouvez l\'historique complet dans le profil.',
    ],
  },
  {
    id: 'breeders',
    icon: Heart,
    title: 'Gérer les reproducteurs',
    description: 'Identifiez vos reproducteurs et suivez leur activité.',
    steps: [
      'Dans l\'onglet "Élevage", consultez la section "Reproducteurs".',
      'Les femelles et mâles éligibles apparaissent automatiquement.',
      'Vous pouvez voir le nombre de portées et le statut de chaque reproducteur.',
      'Suivez les chaleurs depuis le profil de chaque femelle.',
    ],
  },
  {
    id: 'history',
    icon: ClipboardList,
    title: 'Historique de l\'animal',
    description: 'Consultez tout l\'historique santé et événements.',
    steps: [
      'Ouvrez le profil d\'un animal.',
      'Faites défiler pour voir les soins, poids, consultations et événements.',
      'Utilisez le tableau de bord santé pour une vue globale.',
      'Les alertes vous préviennent des soins à venir.',
    ],
  },
  {
    id: 'elevage',
    icon: Building2,
    title: 'Gestion de l\'élevage',
    description: 'Accédez à toutes les fonctionnalités éleveur.',
    steps: [
      'L\'onglet "Élevage" regroupe toutes les fonctions professionnelles.',
      'Dashboard : vue d\'ensemble de votre élevage.',
      'Reproducteurs : suivi des mâles et femelles.',
      'Gestations : suivi des saillies et naissances.',
      'Portées : gestion des portées actives et archivées.',
      'Vous pouvez modifier la date et l\'heure de naissance d\'une portée depuis le bouton "Modifier la portée".',
      'Vous pouvez trier les petits d\'une portée par prénom ou par poids pour les retrouver plus facilement.',
      'Départs & Réservations : gérez les réservations et départs des petits.',
    ],
  },
  {
    id: 'v01-notes',
    icon: ClipboardList,
    title: 'Nouveautés v0.1 — bon à savoir',
    description: 'Les changements importants à connaître.',
    steps: [
      'Les vaccins sont optionnels par défaut : aucun rappel n\'est créé tant que vous ne le configurez pas.',
      'Vous pouvez configurer manuellement les rappels (vaccins, vermifuges, traitements) depuis la fiche santé.',
      'Les animaux stérilisés ou castrés ne sont plus listés comme reproducteurs actifs.',
      'Les reproducteurs en retraite conservent leur historique (saillies, portées, chaleurs).',
      'L\'âge des petits dans une portée est calculé à partir de la date de naissance et de l\'heure de naissance.',
      'La distinction couleur sert principalement à repérer les bébés dans une portée (bracelet ou repère de couleur). Elle s\'affiche dans les portées, pas sur les cartes générales de Ma famille.',
      'L\'historique des mises à jour est disponible dans Paramètres → Historique des mises à jour.',
    ],
  },
];

export default function GuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Guide d'utilisation</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="text-center space-y-2 mb-6">
          <div className="text-4xl">📖</div>
          <h2 className="text-xl font-extrabold text-foreground">Bienvenue sur Anomaya</h2>
          <p className="text-sm text-muted-foreground">
            Retrouvez ici toutes les informations pour bien démarrer avec l'application.
          </p>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {GUIDE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <AccordionItem key={section.id} value={section.id} className="border border-border rounded-xl overflow-hidden bg-card px-1">
                <AccordionTrigger className="px-3 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{section.title}</p>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-4">
                  <ol className="space-y-2 ml-1">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-foreground">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="bg-muted/40 rounded-xl p-4 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            Vous avez une question ou un problème ? Utilisez le bouton{' '}
            <button onClick={() => navigate('/feedback')} className="text-primary font-semibold underline">
              Feedback
            </button>{' '}
            pour nous contacter.
          </p>
        </div>
      </div>
    </div>
  );
}