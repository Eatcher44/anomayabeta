import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const DARK_MODE_KEY = 'pet-dark-mode';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(DARK_MODE_KEY, String(dark));
  }, [dark]);

  return { dark, setDark, toggle: () => setDark((d) => !d) };
}

interface DarkModeToggleProps {
  dark: boolean;
  onToggle: () => void;
}

export default function DarkModeToggle({ dark, onToggle }: DarkModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="w-9 h-9 rounded-full flex items-center justify-center bg-muted hover:bg-accent transition-colors"
      title={dark ? 'Mode clair' : 'Mode sombre'}
    >
      {dark ? <Sun className="w-5 h-5 text-foreground" /> : <Moon className="w-5 h-5 text-foreground" />}
    </button>
  );
}
