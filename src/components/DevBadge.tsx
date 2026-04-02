import { isDev } from '@/config/appVariant';

export default function DevBadge() {
  if (!isDev) return null;

  return (
    <span className="fixed top-2 right-2 z-[9999] pointer-events-none select-none px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm opacity-80">
      DEV
    </span>
  );
}