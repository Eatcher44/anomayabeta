import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/AppLayout';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <AppLayout className="bg-background px-4 py-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Button>

      <h1 className="text-2xl font-bold text-foreground mb-6">Politique de confidentialité</h1>

      <div className="prose prose-sm dark:prose-invert space-y-4 text-muted-foreground">
        <p className="text-foreground font-medium">Dernière mise à jour : 2 avril 2026</p>

        <h2 className="text-lg font-semibold text-foreground">1. Données collectées</h2>
        <p>
          Anomaya collecte uniquement les données nécessaires au fonctionnement de l'application :
          adresse e-mail, données relatives à vos animaux (noms, poids, soins, photos), et
          informations liées à l'élevage si vous utilisez les fonctionnalités éleveur.
        </p>

        <h2 className="text-lg font-semibold text-foreground">2. Utilisation des données</h2>
        <p>
          Vos données sont utilisées exclusivement pour vous fournir les services de l'application.
          Elles ne sont ni vendues, ni partagées avec des tiers à des fins commerciales.
        </p>

        <h2 className="text-lg font-semibold text-foreground">3. Stockage et sécurité</h2>
        <p>
          Les données sont stockées de manière sécurisée sur des serveurs protégés.
          L'accès à vos données est strictement limité à votre compte authentifié.
        </p>

        <h2 className="text-lg font-semibold text-foreground">4. Suppression des données</h2>
        <p>
          Vous pouvez supprimer votre compte et toutes vos données à tout moment depuis
          les paramètres de l'application (icône ⚙️ en haut à droite → Supprimer mon compte).
        </p>

        <h2 className="text-lg font-semibold text-foreground">5. Cookies</h2>
        <p>
          L'application utilise uniquement des cookies techniques nécessaires à l'authentification
          et au bon fonctionnement du service. Aucun cookie publicitaire n'est utilisé.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
        <p>
          Pour toute question relative à vos données personnelles, vous pouvez nous contacter
          via la fonctionnalité "Avis / Bug" intégrée à l'application.
        </p>
      </div>
    </AppLayout>
  );
}
