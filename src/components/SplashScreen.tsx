import React, { useEffect, useState } from 'react';

/**
 * App launch / loading splash screen.
 * - Full-screen branded background image
 * - Subtle dark overlay for text readability
 * - Animated progress bar (asymptotic — never blocks the UI)
 * - Rotating loading messages
 */
export const SPLASH_PHRASES = [
  'Préparation de votre espace…',
  'Réveil des compagnons…',
  'Synchronisation des soins…',
  'Préparation de votre famille…',
  'Chargement…',
];

interface SplashScreenProps {
  /** Override the phrase shown under the progress bar. If omitted, phrases rotate. */
  phrase?: string;
  /** Force progress value (0-100) instead of animated asymptotic progress. */
  progress?: number;
}

export default function SplashScreen({ phrase, progress: forcedProgress }: SplashScreenProps = {}) {
  const [progress, setProgress] = useState(8);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (forcedProgress !== undefined) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + Math.max(1, (95 - p) * 0.08)));
    }, 120);
    return () => clearInterval(id);
  }, [forcedProgress]);

  useEffect(() => {
    if (phrase) return;
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % SPLASH_PHRASES.length);
    }, 2000);
    return () => clearInterval(id);
  }, [phrase]);

  const shownProgress = forcedProgress !== undefined ? forcedProgress : progress;
  const shownPhrase = phrase ?? SPLASH_PHRASES[phraseIndex];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden"
      style={{
        backgroundImage: "url('/splash-anomaya-01.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Subtle dark overlay for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      {/* Spacer */}
      <div />

      {/* Center: title */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center animate-[splash-fade-in_0.7s_ease-out]">
        <h1
          className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl"
          style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}
        >
          Anomaya
        </h1>
        <p
          className="mt-3 text-sm font-medium text-white/85 sm:text-base"
          style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
        >
          Le suivi de vos animaux au quotidien
        </p>
      </div>

      {/* Bottom: progress */}
      <div className="relative z-10 w-full max-w-xs px-6 pb-10 animate-[splash-fade-in_0.9s_ease-out_0.15s_both]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
          <div
            className="h-full rounded-full bg-gradient-to-r from-white/70 via-white to-white/70 transition-[width] duration-300 ease-out"
            style={{ width: `${shownProgress}%` }}
          />
        </div>
        <p
          className="mt-3 text-center text-[11px] font-medium tracking-wide text-white/90"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
        >
          {shownPhrase}
        </p>
      </div>

      <style>{`
        @keyframes splash-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
