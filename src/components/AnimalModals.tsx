import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cat, Dog, HelpCircle } from 'lucide-react';
import { catBreeds, dogBreeds } from '@/utils/breeds';
import DateField from '@/components/DateField';

// Types
interface AnimalFormData {
  nom: string;
  type: string;
  sexe: 'Mâle' | 'Femelle';
  race: string;
  naissance: Date;
  photo?: string | null;
}

// Step 1: Nom
interface NomModalProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  isEdit?: boolean;
}

export function NomModal({ open, onClose, value, onChange, onNext, isEdit }: NomModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier' : 'Nouvel animal'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nom</Label>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="ex: Yuumi"
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={onNext} disabled={!value.trim()}>Continuer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 2: Type
interface TypeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
  onCustom: () => void;
}

export function TypeModal({ open, onClose, onSelect, onCustom }: TypeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Type d'animal</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => onSelect('Chien')}
              className="flex flex-col items-center p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-accent transition-colors"
            >
              <Dog className="w-12 h-12 text-primary mb-2" />
              <span className="font-bold">Chien</span>
            </button>
            <button
              onClick={() => onSelect('Chat')}
              className="flex flex-col items-center p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-accent transition-colors"
            >
              <Cat className="w-12 h-12 text-primary mb-2" />
              <span className="font-bold">Chat</span>
            </button>
          </div>
          <button
            onClick={onCustom}
            className="mt-4 text-primary hover:underline text-sm block mx-auto"
          >
            Autre type…
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 2b: Custom Type
interface CustomTypeModalProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}

export function CustomTypeModal({ open, onClose, value, onChange, onNext }: CustomTypeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Autre type</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Type d'animal</Label>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="ex: Lapin"
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Retour</Button>
            <Button onClick={onNext} disabled={!value.trim()}>Continuer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 3: Sexe
interface SexeModalProps {
  open: boolean;
  onClose: () => void;
  value: 'Mâle' | 'Femelle';
  onChange: (v: 'Mâle' | 'Femelle') => void;
  onNext: () => void;
}

export function SexeModal({ open, onClose, value, onChange, onNext }: SexeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sexe</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onChange('Femelle')}
              className={`px-6 py-3 rounded-full border-2 font-semibold transition-colors ${
                value === 'Femelle'
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border hover:border-primary'
              }`}
            >
              ♀ Femelle
            </button>
            <button
              onClick={() => onChange('Mâle')}
              className={`px-6 py-3 rounded-full border-2 font-semibold transition-colors ${
                value === 'Mâle'
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border hover:border-primary'
              }`}
            >
              ♂ Mâle
            </button>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={onNext}>Continuer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 4: Race
interface RaceModalProps {
  open: boolean;
  onClose: () => void;
  type: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
}

export function RaceModal({ open, onClose, type, value, onChange, onSave }: RaceModalProps) {
  const [search, setSearch] = React.useState('');
  const isCat = type.toLowerCase().includes('chat');
  const isDog = type.toLowerCase().includes('chien');
  
  const breeds = isCat ? catBreeds : isDog ? dogBreeds : [];
  const filteredBreeds = search.trim()
    ? breeds.filter(b => b.toLowerCase().includes(search.trim().toLowerCase()))
    : breeds;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Race</DialogTitle>
        </DialogHeader>
        <div className="py-4 flex flex-col">
          {(isCat || isDog) ? (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une race"
                className="mb-3"
              />
              <ScrollArea className="h-[200px]">
                {filteredBreeds.map((breed) => (
                  <button
                    key={breed}
                    onClick={() => {
                      onChange(breed);
                      onSave();
                    }}
                    className={`w-full text-left py-2 px-3 rounded hover:bg-accent transition-colors ${
                      value === breed ? 'bg-accent font-semibold' : ''
                    }`}
                  >
                    {breed}
                  </button>
                ))}
              </ScrollArea>
              <div className="border-t border-border mt-3 pt-3">
                <Label className="text-sm text-muted-foreground">Ou saisir manuellement :</Label>
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="ex: Race personnalisée"
                  className="mt-1.5"
                />
              </div>
            </>
          ) : (
            <div>
              <Label>Race ou espèce</Label>
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="ex: Bélier nain"
                className="mt-1.5"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={onSave}>Enregistrer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 5: Naissance (optionnel, peut être combiné)
interface NaissanceModalProps {
  open: boolean;
  onClose: () => void;
  value: Date;
  onChange: (d: Date) => void;
  onSave: () => void;
}

export function NaissanceModal({ open, onClose, value, onChange, onSave }: NaissanceModalProps) {
  const [valid, setValid] = React.useState(true);
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Date de naissance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <DateField
            value={value}
            onChange={onChange}
            maximumDate={new Date()}
            title="Date de naissance"
            onValidityChange={setValid}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={onSave} disabled={!valid}>Enregistrer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
