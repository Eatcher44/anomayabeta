import React, { useEffect, useState } from 'react';
import { Cat, Dog, Bird, Rabbit, PawPrint } from 'lucide-react';

/**
 * App launch / loading splash screen.
 * - Soft branded gradient background
 * - Subtle floating animal silhouettes
 * - Animated progress bar (asymptotic — never blocks the UI)
 * - Light & dark mode compatible, safe-area aware
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
    // Asymptotic progress: feels alive, never reaches 100 on its own.
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-background via-background to-primary/5 dark:from-background dark:via-background dark:to-primary/10"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Soft radial glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-72 w-[140%] -translate-x-1/2 rounded-[100%] bg-primary/5 blur-2xl" />
      </div>

      {/* Floating animal silhouettes — subtle, blurred */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] dark:opacity-[0.14]">
        <Cat className="absolute left-[8%] top-[18%] h-16 w-16 text-primary animate-[splash-float_7s_ease-in-out_infinite]" />
        <Dog className="absolute right-[10%] top-[14%] h-20 w-20 text-primary animate-[splash-float_8s_ease-in-out_infinite_0.6s]" />
        <Rabbit className="absolute left-[14%] bottom-[28%] h-14 w-14 text-primary animate-[splash-float_9s_ease-in-out_infinite_1.2s]" />
        <Bird className="absolute right-[14%] bottom-[32%] h-12 w-12 text-primary animate-[splash-float_6.5s_ease-in-out_infinite_0.3s]" />
        <PawPrint className="absolute left-[44%] top-[10%] h-8 w-8 text-primary animate-[splash-float_7.5s_ease-in-out_infinite_1.8s]" />
        <PawPrint className="absolute right-[36%] bottom-[18%] h-6 w-6 text-primary animate-[splash-float_8.5s_ease-in-out_infinite_0.9s]" />
      </div>

      {/* Spacer */}
      <div />

      {/* Center: title */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center animate-[splash-fade-in_0.7s_ease-out]">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 backdrop-blur-sm ring-1 ring-primary/20 shadow-sm">
          <PawPrint className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Anomaya
        </h1>
        <p className="mt-3 text-sm font-medium text-muted-foreground sm:text-base">
          Le suivi de vos animaux au quotidien
        </p>
      </div>

      {/* Bottom: progress */}
      <div
        className="relative z-10 w-full max-w-xs px-6 pb-10 animate-[splash-fade-in_0.9s_ease-out_0.15s_both]"
      >
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-center text-[11px] font-medium tracking-wide text-muted-foreground">
          Préparation de votre espace…
        </p>
      </div>

      <style>{`
        @keyframes splash-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes splash-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
