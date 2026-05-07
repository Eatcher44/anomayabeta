import React, { useEffect, useState } from 'react';

/**
 * App launch / loading splash screen.
 * - Branded background image (already contains the Anomaya logo)
 * - Responsive scaling: cover on mobile, contain on tablet/desktop with dark backdrop
 * - Subtle dark overlay for text readability
 * - Animated progress bar + rotating loading messages
 */
export const SPLASH_PHRASES = [
  'Préparation de votre espace…',
  'Réveil des compagnons…',
  'Synchronisation des soins…',
  'Préparation de votre famille…',
  'Chargement…',
];

interface SplashScreenProps {
  phrase?: string;
  progress?: number;
}

const SPLASH_IMG = '/splash-anomaya-01.png';

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
      className="splash-root fixed inset-0 z-[100] flex flex-col items-center justify-end overflow-hidden"
      style={{
        backgroundColor: '#06101f',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Blurred backdrop (fills empty sides on wide screens) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url('${SPLASH_IMG}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.55)',
          transform: 'scale(1.15)',
        }}
      />

      {/* Main image layer (cover on mobile, contain on wider) */}
      <div
        aria-hidden
        className="splash-image pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url('${SPLASH_IMG}')`,
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Subtle dark overlay for text readability (mostly bottom) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55" />

      {/* Bottom: progress + rotating phrase */}
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
        /* Mobile portrait: cover, slightly biased toward upper composition */
        .splash-image {
          background-size: cover;
          background-position: center 40%;
        }
        /* Tablet & up: contain so nothing gets overzoomed */
        @media (min-width: 768px) {
          .splash-image {
            background-size: contain;
            background-position: center center;
          }
        }
        @keyframes splash-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
