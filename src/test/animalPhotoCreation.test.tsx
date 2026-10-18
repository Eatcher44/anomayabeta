import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';

const m = vi.hoisted(() => ({ animals: [], appointments: [], add: vi.fn(), update: vi.fn(), pick: vi.fn(), upload: vi.fn(), toast: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/context/AnimalsContext', () => ({ useAnimals: () => ({ animaux: m.animals, rendezvous: m.appointments, addAnimal: m.add, updateAnimal: m.update, loading: false }) }));
vi.mock('@/context/BreederContext', () => ({ useBreeder: () => ({ isBreeder: false }) }));
vi.mock('@/utils/photo', () => ({ pickPhotoFile: m.pick, uploadAnimalPhoto: m.upload }));
vi.mock('@/hooks/use-toast', () => ({ toast: m.toast }));
vi.mock('@/components/AccountDeletionSection', () => ({ default: () => null }));
vi.mock('@/components/HealthDashboard', () => ({ default: () => null }));
vi.mock('@/components/BetaPlanSwitcher', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/components/AnimalModals', () => ({
  NomModal: (p: any) => p.open && <><input aria-label="name" value={p.value} onChange={e => p.onChange(e.target.value)} /><button onClick={p.onNext}>name next</button></>,
  TypeModal: (p: any) => p.open && <button onClick={() => p.onSelect('Chat')}>cat</button>,
  SexeModal: (p: any) => p.open && <button onClick={p.onNext}>sex next</button>,
  SterilModal: (p: any) => p.open && <button onClick={p.onNext}>steril next</button>,
  RaceModal: (p: any) => p.open && <><input aria-label="breed" value={p.value} onChange={e => p.onChange(e.target.value)} /><button onClick={p.onNext}>breed next</button></>,
  NaissanceModal: (p: any) => p.open && <button onClick={p.onSkip}>birth skip</button>,
  CustomTypeModal: () => null, DeleteConfirmModal: () => null,
  PhotoModal: (p: any) => p.open && <><button onClick={p.onPickGallery}>gallery</button><button onClick={p.onTakePhoto}>camera</button><button onClick={p.onSave}>save</button></>,
}));
async function wizard() {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter un animal' }));
  fireEvent.click(screen.getByText('Ajouter mon animal'));
  fireEvent.change(screen.getByLabelText('name'), { target: { value: 'milo' } });
  for (const name of ['name next', 'cat', 'sex next', 'steril next']) fireEvent.click(screen.getByText(name));
  fireEvent.change(screen.getByLabelText('breed'), { target: { value: 'Siamois' } });
  fireEvent.click(screen.getByText('breed next'));
  fireEvent.click(screen.getByText('birth skip'));
}
beforeEach(() => { cleanup(); vi.clearAllMocks(); m.add.mockResolvedValue(undefined); m.pick.mockResolvedValue(null); m.upload.mockResolvedValue('https://test.invalid/owner-photo'); });
describe('explicit animal creation rules', () => {
  it.each(['gallery', 'camera'])('cancellation via %s never uploads or creates and preserves entered values', async mode => {
    await wizard(); fireEvent.click(screen.getByText(mode));
    await waitFor(() => expect(m.pick).toHaveBeenCalledTimes(1));
    expect(m.upload).not.toHaveBeenCalled(); expect(m.add).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(m.add).toHaveBeenCalledTimes(1));
    expect(m.add.mock.calls[0][0]).toMatchObject({ nom: 'Milo', race: 'Siamois', type: 'Chat', photo: null });
  });
  it('selected photo does not upload or create until explicit save', async () => {
    const file = new File(['photo'], 'selected.png'); m.pick.mockResolvedValue(file);
    await wizard(); fireEvent.click(screen.getByText('gallery'));
    await waitFor(() => expect(m.pick).toHaveBeenCalled());
    expect(m.upload).not.toHaveBeenCalled(); expect(m.add).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(m.add).toHaveBeenCalledTimes(1));
    expect(m.add.mock.calls[0][0].photo).toBe('https://test.invalid/owner-photo');
  });
  it('upload failure creates nothing and retry uses the selected file', async () => {
    m.pick.mockResolvedValue(new File(['photo'], 'retry.png')); m.upload.mockRejectedValueOnce(new Error('offline'));
    await wizard(); fireEvent.click(screen.getByText('gallery')); await waitFor(() => expect(m.pick).toHaveBeenCalled());
    fireEvent.click(screen.getByText('save')); await waitFor(() => expect(m.toast).toHaveBeenCalled());
    expect(m.add).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(m.add).toHaveBeenCalledTimes(1)); expect(m.upload).toHaveBeenCalledTimes(2);
  });
  it('repeated save clicks while a write is pending create only once', async () => {
    let finish: (() => void) | undefined;
    m.add.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    await wizard(); fireEvent.click(screen.getByText('save')); fireEvent.click(screen.getByText('save')); fireEvent.click(screen.getByText('save'));
    expect(m.add).toHaveBeenCalledTimes(1); finish?.();
    await waitFor(() => expect(screen.queryByText('save')).toBeNull());
  });
  it('a failed record save retries the same uploaded object without uploading again', async () => {
    m.pick.mockResolvedValue(new File(['photo'], 'retry.png')); m.add.mockRejectedValueOnce(new Error('write failed'));
    await wizard(); fireEvent.click(screen.getByText('gallery')); await waitFor(() => expect(m.pick).toHaveBeenCalled());
    fireEvent.click(screen.getByText('save')); await waitFor(() => expect(m.toast).toHaveBeenCalled());
    fireEvent.click(screen.getByText('save')); await waitFor(() => expect(m.add).toHaveBeenCalledTimes(2));
    expect(m.upload).toHaveBeenCalledTimes(1); expect(m.add.mock.calls[0][0].photo).toBe(m.add.mock.calls[1][0].photo);
    expect(m.add.mock.calls[0][1]).toEqual(expect.any(String));
    expect(m.add.mock.calls[1][1]).toBe(m.add.mock.calls[0][1]);
  });
});