'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useDemo } from '@/lib/store';

const HydratedCtx = createContext(false);
export const useHydrated = () => useContext(HydratedCtx);

export function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    Promise.resolve(useDemo.persist.rehydrate()).finally(() => setHydrated(true));
  }, []);
  return (
    <HydratedCtx.Provider value={hydrated}>
      {children}
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }} />
    </HydratedCtx.Provider>
  );
}

export function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Loading">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    );
  }
  return <>{children}</>;
}
