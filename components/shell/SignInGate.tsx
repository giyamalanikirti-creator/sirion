'use client';

import { KeyRound, UserRound } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { Disclaimer } from '../ui';
import { Logo } from './Logo';

/**
 * Demo stand-in for sign-in. In the product, Sirion customers sign in with company
 * single sign-on; here, one click enters as Riya, the procurement lead.
 */
export function SignInGate({ children }: { children: React.ReactNode }) {
  const signedIn = useDemo((s) => s.signedIn);
  const signIn = useDemo((s) => s.signIn);
  const profile = useDemo((s) => s.profile);
  if (signedIn) return <>{children}</>;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-page-bg px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-8">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" color="#0C5E69" />
          <div>
            <div className="text-[18px] font-semibold text-ink">Cost of Yes</div>
            <div className="text-xs text-muted">A negotiation assistant for Sirion customers · concept</div>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="mt-8 flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-line text-sm text-muted"
          title="In the product, you sign in with your company’s single sign-on"
        >
          <KeyRound className="h-4 w-4" /> Sign in with company SSO
        </button>
        <p className="mt-1.5 text-center text-[11px] text-muted">In the product, you sign in with your company’s single sign-on.</p>
        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-line" /> Demo <span className="h-px flex-1 bg-line" />
        </div>
        <button
          type="button"
          onClick={signIn}
          autoFocus
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-900 text-sm font-medium text-white hover:bg-teal-700"
        >
          <UserRound className="h-4 w-4" /> Continue as {profile.fullName}, {profile.jobTitle.toLowerCase()}
        </button>
        <p className="mt-2 text-center text-xs text-muted">Fictional demo data. Nothing you do here leaves your browser.</p>
        <Disclaimer className="mt-6 text-center" />
      </div>
    </div>
  );
}
