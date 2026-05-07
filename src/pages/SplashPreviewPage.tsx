import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isBeta, isDev } from '@/config/appVariant';
import SplashScreen, { SPLASH_PHRASES } from '@/components/SplashScreen';

/**
 * Beta/dev-only static preview of the splash/loading screen.
 * Not linked from production navigation.
 */
export default function SplashPreviewPage() {
  if (!isBeta && !isDev) {
    return <Navigate to="/" replace />;
  }

  const [phraseIdx, setPhraseIdx] = useState<number | 'auto'>('auto');
  const [progress, setProgress] = useState<number | 'auto'>('auto');

  return (
    <>
      <SplashScreen
        phrase={phraseIdx === 'auto' ? undefined : SPLASH_PHRASES[phraseIdx]}
        progress={progress === 'auto' ? undefined : progress}
      />

      {/* Floating dev controls — above the splash */}
      <div
        className="fixed left-1/2 top-3 z-[200] -translate-x-1/2 flex flex-wrap items-center gap-2 rounded-xl bg-card/95 px-3 py-2 text-xs shadow-lg ring-1 ring-border backdrop-blur"
        style={{ maxWidth: 'calc(100vw - 16px)' }}
      >
        <span className="font-bold text-foreground">Splash preview</span>
        <select
          value={phraseIdx === 'auto' ? 'auto' : String(phraseIdx)}
          onChange={(e) =>
            setPhraseIdx(e.target.value === 'auto' ? 'auto' : Number(e.target.value))
          }
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
        >
          <option value="auto">Auto (rotate 2s)</option>
          {SPLASH_PHRASES.map((p, i) => (
            <option key={i} value={i}>{p}</option>
          ))}
        </select>
        <select
          value={progress === 'auto' ? 'auto' : String(progress)}
          onChange={(e) =>
            setProgress(e.target.value === 'auto' ? 'auto' : Number(e.target.value))
          }
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
        >
          <option value="auto">Auto progress</option>
          <option value="0">0%</option>
          <option value="25">25%</option>
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="100">100%</option>
        </select>
      </div>
    </>
  );
}
