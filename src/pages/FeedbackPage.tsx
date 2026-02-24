import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Bug, Send, CheckCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { APP_VARIANT } from '@/config/appVariant';
import { pickPhotoFile, uploadAnimalPhoto } from '@/utils/photo';

interface FeedbackFormProps {
  type: 'feedback' | 'bug';
}

function FeedbackForm({ type }: FeedbackFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleScreenshot = async () => {
    if (!user) return;
    const file = await pickPhotoFile('image/*');
    if (!file) return;
    try {
      const url = await uploadAnimalPhoto(user.id, `feedback-${Date.now()}`, file);
      setScreenshotUrl(url);
      toast({ title: 'Capture ajoutée' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          type,
          subject: subject.trim() || undefined,
          message: message.trim(),
          steps: type === 'bug' ? steps.trim() || undefined : undefined,
          userId: user.id,
          userEmail: user.email,
          route: window.location.pathname,
        },
      });

      if (error) throw error;
      setSent(true);
    } catch {
      toast({ title: 'Échec d\'envoi', description: 'Réessayez.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-[hsl(var(--status-green))]" />
        <h2 className="text-xl font-bold text-foreground">Merci pour votre retour 🙏</h2>
        <p className="text-sm text-muted-foreground">Votre {type === 'bug' ? 'rapport de bug' : 'feedback'} a été envoyé.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Retour</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-8">
      {type === 'feedback' ? (
        <>
          <div>
            <Label>Sujet (optionnel)</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="ex: Suggestion d'amélioration" className="mt-1" />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Dites-nous ce que vous pensez..." rows={5} className="mt-1" />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label>Description du bug *</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez le problème rencontré..." rows={4} className="mt-1" />
          </div>
          <div>
            <Label>Étapes pour reproduire</Label>
            <Textarea value={steps} onChange={e => setSteps(e.target.value)} placeholder="1. Aller sur...\n2. Cliquer sur...\n3. Observer..." rows={4} className="mt-1" />
          </div>
          <div>
            <Label>Capture d'écran (optionnel)</Label>
            <Button variant="outline" size="sm" onClick={handleScreenshot} className="mt-1">
              <Camera className="w-4 h-4 mr-2" />
              {screenshotUrl ? 'Capture ajoutée ✓' : 'Ajouter une capture'}
            </Button>
          </div>
        </>
      )}
      <Button onClick={handleSubmit} disabled={!message.trim() || sending} className="w-full">
        <Send className="w-4 h-4 mr-2" />
        {sending ? 'Envoi...' : type === 'bug' ? 'Envoyer le rapport' : 'Envoyer'}
      </Button>
    </div>
  );
}

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'choose' | 'feedback' | 'bug'>('choose');

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => mode === 'choose' ? navigate(-1) : setMode('choose')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            {mode === 'choose' ? 'Bêta Test' : mode === 'feedback' ? 'Envoyer un feedback' : 'Signaler un bug'}
          </h1>
        </div>
      </div>

      {mode === 'choose' ? (
        <div className="px-4 pt-6 space-y-3 max-w-lg mx-auto">
          <Card
            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setMode('feedback')}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Envoyer un feedback</h3>
              <p className="text-xs text-muted-foreground">Partagez vos impressions et suggestions</p>
            </div>
          </Card>
          <Card
            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setMode('bug')}
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Bug className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Signaler un bug</h3>
              <p className="text-xs text-muted-foreground">Aidez-nous à corriger les problèmes</p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="pt-4 max-w-lg mx-auto">
          <FeedbackForm type={mode} />
        </div>
      )}
    </div>
  );
}
