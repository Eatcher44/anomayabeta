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

      <h1 className="text-2xl font-bold text-foreground mb-4">Politique de confidentialité — Anomaya</h1>

      <Button asChild variant="outline" className="mb-6 w-full sm:w-auto">
        <a href="#supprimer-mon-compte">Supprimer mon compte</a>
      </Button>

      <div className="prose prose-sm dark:prose-invert space-y-4 text-muted-foreground">
        <p className="text-foreground font-medium">Dernière mise à jour : 18 octobre 2026</p>

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

        <section aria-labelledby="supprimer-mon-compte" className="border-l-4 border-primary pl-4 space-y-4">
          <h2 id="supprimer-mon-compte" tabIndex={-1} className="text-xl font-semibold text-foreground scroll-mt-6">
            4. Supprimer mon compte et mes données
          </h2>
          <h3 className="font-semibold text-foreground">Depuis Anomaya</h3>
          <p>
            Vous pouvez supprimer votre compte depuis <strong>Paramètres → Supprimer mon compte</strong>.
            Une confirmation vous est demandée avant la suppression.
          </p>
          <h3 className="font-semibold text-foreground">Sans installer ni ouvrir l’application</h3>
          <p>
            Envoyez votre demande de suppression de compte à{' '}
            <a className="text-primary underline underline-offset-4 break-words" href="mailto:support@anomaya.app?subject=Demande%20de%20suppression%20de%20compte%20Anomaya">support@anomaya.app</a>,
            de préférence depuis l’adresse e-mail enregistrée sur votre compte.
            Si vous n’avez plus accès à cette adresse, indiquez-le dans votre demande :
            le support vous proposera une procédure adaptée de vérification de votre identité
            avant toute suppression. Ne communiquez jamais votre mot de passe.
          </p>
          <h3 className="font-semibold text-foreground">Données supprimées et exceptions</h3>
          <p>
            La suppression du compte retire les animaux associés, les portées, l’historique médical,
            les rappels, les rendez-vous, les données de pharmacie, les informations d’élevage
            et les photos concernées. Les animaux déjà légitimement transférés à un autre utilisateur
            sont conservés sur son compte, avec les données et photos nécessaires à leur suivi.
          </p>
          <h3 className="font-semibold text-foreground">Sauvegardes et échanges avec le support</h3>
          <p>
            Les sauvegardes de la base de données peuvent conserver temporairement des données
            supprimées pendant environ 14 jours, sous réserve de confirmation de la politique
            de conservation effectivement appliquée par l’hébergeur.
          </p>
          <p>
            Les e-mails déjà envoyés au support peuvent être conservés selon la politique
            de conservation applicable aux échanges avec le support. La durée de cette conservation
            n’est pas confirmée ici ; vous pouvez demander des précisions à support@anomaya.app.
          </p>
        </section>

        <h2 className="text-lg font-semibold text-foreground">5. Cookies</h2>
        <p>
          L'application utilise uniquement des cookies techniques nécessaires à l'authentification
          et au bon fonctionnement du service. Aucun cookie publicitaire n'est utilisé.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
        <p>
          Pour toute question relative à vos données personnelles, vous pouvez nous contacter
          à{' '}
          <a className="text-primary underline underline-offset-4 break-words" href="mailto:support@anomaya.app">support@anomaya.app</a>.
        </p>
      </div>
    </AppLayout>
  );
}
