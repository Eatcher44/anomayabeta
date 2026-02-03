// Listes de races pour chats et chiens

export const catBreeds = [
  'Européen (chat de gouttière)',
  'Bengal',
  'Birman',
  'British shorthair',
  'Chartreux',
  'Maine Coon',
  'Norvégien',
  'Persan',
  'Ragdoll',
  'Sibérien',
  'Sphynx',
];

export const dogBreeds = [
  'Berger Allemand',
  'Berger australien',
  'Beagle',
  'Beauceron',
  'Border Collie',
  'Bouledogue français',
  'Cavalier King Charles',
  'Chihuahua',
  'Cocker Spaniel Anglais',
  'Golden Retriever',
  'Labrador Retriever',
  'Malinois',
  'Rottweiler',
  'Staffordshire Bull Terrier',
  'Teckel',
  'Yorkshire Terrier',
  'Spitz allemand',
];

// Affichage convivial (abrège "Européen (chat de gouttière)" en "Européen")
export const displayBreed = (breed: string | undefined | null): string =>
  breed === 'Européen (chat de gouttière)' ? 'Européen' : (breed || '—');
