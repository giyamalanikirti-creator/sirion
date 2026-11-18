'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import sortFixtures from '@/data/fixtures/sort_fixtures.json';
import { getRedline, redlines } from './data';
import { buildPackages } from './engines/givegetEngine';
import { changedLines } from './engines/redline';
import { DEFAULT_PROFILE, type Profile } from './account';
import type { ChangeClass, Counter, CreditsGroup, PackageId, SortResult } from './types';

export type Role = 'lead' | 'owner' | 'finance' | 'legal' | 'supplier';

export type Status =
  | 'received' | 'sorted' | 'priced' | 'packages_ready' | 'awaiting_approval'
  | 'approved' | 'with_supplier' | 'countered' | 'agreed' | 'signed';

export const STATUS_ORDER: Status[] = [
  'received', 'sorted', 'priced', 'packages_ready', 'awaiting_approval',
  'approved', 'with_supplier', 'countered', 'agreed', 'signed',
];
export const atLeast = (s: Status, min: Status) => STATUS_ORDER.indexOf(s) >= STATUS_ORDER.indexOf(min);

export const STATUS_LABEL: Record<Status, string> = {
  received: 'New',
  sorted: 'Analysed',
  priced: 'Impact reviewed',
  packages_ready: 'Offers ready',
  awaiting_approval: 'Awaiting approval',
  approved: 'Approved',
  with_supplier: 'With supplier',
  countered: 'Counter received',
  agreed: 'Agreed',
  signed: 'Signed',
};

export const ROLE_LABEL: Record<Role, string> = {
  lead: 'Procurement lead',
  owner: 'Business owner',
  finance: 'Finance',
  legal: 'Legal',
  supplier: 'Supplier',
};

export const ROLE_HOME: Record<Role, string> = {
  lead: '/',
  owner: '/approvals',
  finance: '/approvals',
  legal: '/legal',
  supplier: '/portal',
};

/** The redline the guided demo story follows. */
export const STORY_REDLINE = 'RL-CLOUDDESK';

export type LegalDecision = 'accepted' | 'rejected' | 'redlined';

/** Everything that changes as one redline moves from inbox to signature. */
export interface Negotiation {
  status: Status;
  sortResult?: SortResult;
  selectedPackages: PackageId[];
  ownerApproved: boolean;
  /** Finance's decision on the offered packages that need finance (multi-year commitments). */
  financeDecision?: 'approved' | 'rejected';
  supplierPick?: PackageId;
  counter?: Counter;
  /** Legal's decision per legal change number. */
  legalDecisions: Record<number, LegalDecision>;
  signedAt?: string;
  /** Buyer preference: keep the right to leave every year (rules out a 3-year term). */
  keepAnnualExit: boolean;
  /** Credits what-if the lead saved as a draft counteroffer (from the price tag card). */
  creditDraft?: CreditsGroup;
  /** The lead added her saved what-if as an offer of her own (package E). */
  draftInOffers?: boolean;
  invoiceChecked: boolean;
}

/** Workspace data settings an admin controls. */
export interface DataSettings {
  /** Estimates may use aggregate peer benchmarks (20+ companies). */
  usePeerBenchmarks: boolean;
  /** This workspace contributes aggregate outcomes to peer benchmarks. Off by default. */
  contributeOutcomes: boolean;
}

type Result = { ok: boolean; message?: string };

const allPackageIds = (redlineId: string) => buildPackages({ redlineId }).map((p) => p.id).sort() as PackageId[];

/** Packages among those offered that need a finance decision. */
export const financePackages = (redlineId: string, selected: PackageId[]) =>
  buildPackages({ redlineId }).filter((p) => selected.includes(p.id) && p.approvals.includes('finance')).map((p) => p.id);

export const needsFinanceStep = (redlineId: string, selected: PackageId[]) => financePackages(redlineId, selected).length > 0;

export const hasMoneyLines = (redlineId: string) => changedLines(getRedline(redlineId)).length > 0;

export const legalChanges = (redlineId: string) => getRedline(redlineId).changes.filter((c) => c.expected.group === 'legal');

function freshNegotiation(redlineId: string): Negotiation {
  // The story redline arrives new; the others arrived earlier and are already sorted (and priced if they have money lines).
  const isStory = redlineId === STORY_REDLINE;
  const results = (sortFixtures as Record<string, ChangeClass[]>)[redlineId];
  return {
    status: isStory ? 'received' : hasMoneyLines(redlineId) ? 'priced' : 'sorted',
    sortResult: isStory ? undefined : { results, source: 'cached' },
    selectedPackages: allPackageIds(redlineId),
    ownerApproved: false,
    legalDecisions: {},
    keepAnnualExit: false,
    invoiceChecked: false,
  };
}

export const initialNegotiations = () => Object.fromEntries(redlines.map((r) => [r.id, freshNegotiation(r.id)])) as Record<string, Negotiation>;

interface DemoState {
  role: Role;
  negotiations: Record<string, Negotiation>;
  completedSteps: number[];
  /** Demo stand-in for company single sign-on. */
  signedIn: boolean;
  welcomeDismissed: boolean;
  data: DataSettings;
  /** The signed-in user's profile (name and title only; never permissions). */
  profile: Profile;
  guideOpen: boolean;

  updateProfile: (p: Profile) => void;
  setGuideOpen: (open: boolean) => void;
  signOut: () => void;

  signIn: () => void;
  dismissWelcome: () => void;
  setData: (p: Partial<DataSettings>) => void;
  addDraftOffer: (id: string) => Result;

  setRole: (r: Role) => void;
  completeStep: (n: number) => void;
  sort: (id: string, r: SortResult) => Result;
  markPriced: (id: string) => void;
  togglePackage: (id: string, pkg: PackageId) => void;
  viewPackages: (id: string) => void;
  sendForApproval: (id: string) => Result;
  approveOwner: (id: string) => Result;
  decideFinance: (id: string, d: 'approved' | 'rejected') => Result;
  sendToSupplier: (id: string) => Result;
  supplierSubmit: (id: string, pick: PackageId, counter?: Counter) => Result;
  acceptCounter: (id: string) => Result;
  declineCounter: (id: string) => Result;
  sign: (id: string) => Result;
  decideLegal: (id: string, changeNo: number, d: LegalDecision) => void;
  setKeepAnnualExit: (id: string, v: boolean) => void;
  saveCreditDraft: (id: string, g: CreditsGroup | undefined) => void;
  runInvoiceCheck: (id: string) => Result;
  reset: () => void;
}

const fail = (message: string): Result => {
  toast(message);
  return { ok: false, message };
};

const supplierName = (id: string) => getRedline(id).supplier;

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => {
      const neg = (id: string) => get().negotiations[id] ?? freshNegotiation(id);
      const patch = (id: string, p: Partial<Negotiation>) =>
        set((s) => ({ negotiations: { ...s.negotiations, [id]: { ...(s.negotiations[id] ?? freshNegotiation(id)), ...p } } }));
      /** Demo-guide steps follow the story redline only. */
      const step = (id: string, n: number) => {
        if (id !== STORY_REDLINE) return;
        const s = get().completedSteps;
        if (!s.includes(n)) set({ completedSteps: [...s, n].sort((a, b) => a - b) });
      };
      const maybeApprove = (id: string) => {
        const n = neg(id);
        if (n.status !== 'awaiting_approval' || !n.ownerApproved) return;
        if (needsFinanceStep(id, n.selectedPackages) && !n.financeDecision) return;
        const rejected = n.financeDecision === 'rejected' ? financePackages(id, n.selectedPackages) : [];
        const selected = n.selectedPackages.filter((p) => !rejected.includes(p));
        patch(id, { status: 'approved', selectedPackages: selected.length ? selected : n.selectedPackages });
        step(id, 6);
      };

      return {
        role: 'lead',
        negotiations: initialNegotiations(),
        completedSteps: [],
        signedIn: false,
        welcomeDismissed: false,
        data: { usePeerBenchmarks: true, contributeOutcomes: false },
        profile: DEFAULT_PROFILE,
        guideOpen: false,

        updateProfile: (profile) => set({ profile: { fullName: profile.fullName.trim(), preferredName: profile.preferredName.trim(), jobTitle: profile.jobTitle.trim() } }),
        setGuideOpen: (guideOpen) => set({ guideOpen }),
        signOut: () => set({ signedIn: false, role: 'lead' }),
        signIn: () => set({ signedIn: true, role: 'lead' }),
        dismissWelcome: () => set({ welcomeDismissed: true }),
        setData: (p) => {
          set({ data: { ...get().data, ...p } });
          if (p.usePeerBenchmarks !== undefined) {
            toast(p.usePeerBenchmarks ? 'Estimates may now use peer benchmarks' : 'Peer benchmarks off: estimates use your own data only');
          }
        },
        addDraftOffer: (id) => {
          const n = neg(id);
          if (!n.creditDraft) return fail('Save a draft on the Financial impact tab first');
          if (atLeast(n.status, 'awaiting_approval')) return fail('Offers are locked once they are sent for approval');
          patch(id, { draftInOffers: true, selectedPackages: [...new Set([...n.selectedPackages, 'E' as PackageId])].sort() as PackageId[] });
          toast.success('Your draft is now offer E in the comparison');
          return { ok: true };
        },

        setRole: (role) => set({ role }),
        completeStep: (n) => step(STORY_REDLINE, n),

        sort: (id, sortResult) => {
          const s = neg(id).status;
          if (s !== 'received' && s !== 'sorted') return { ok: true };
          patch(id, { sortResult, status: 'sorted' });
          step(id, 2);
          return { ok: true };
        },
        markPriced: (id) => {
          if (neg(id).status === 'sorted' && hasMoneyLines(id)) patch(id, { status: 'priced' });
        },
        togglePackage: (id, pkg) => {
          const n = neg(id);
          if (atLeast(n.status, 'awaiting_approval')) {
            toast('Packages are locked once they are sent for approval');
            return;
          }
          const has = n.selectedPackages.includes(pkg);
          if (has && n.selectedPackages.length === 1) {
            toast('Keep at least one package');
            return;
          }
          patch(id, { selectedPackages: has ? n.selectedPackages.filter((p) => p !== pkg) : ([...n.selectedPackages, pkg].sort() as PackageId[]) });
        },
        viewPackages: (id) => {
          if (neg(id).status === 'priced') patch(id, { status: 'packages_ready' });
        },
        sendForApproval: (id) => {
          const s = neg(id).status;
          if (!hasMoneyLines(id)) return fail('No money lines to approve: this redline only has legal changes');
          if (s === 'received' || s === 'sorted') return fail('Sort the changes and check the price tags first');
          if (atLeast(s, 'awaiting_approval')) return fail('Already sent for approval');
          patch(id, { status: 'awaiting_approval' });
          step(id, 5);
          toast.success('Sent to the business owner for approval');
          return { ok: true };
        },
        approveOwner: (id) => {
          const n = neg(id);
          if (n.status !== 'awaiting_approval') {
            return fail(atLeast(n.status, 'approved') ? 'Already approved' : 'Nothing to approve yet: the lead has not sent packages');
          }
          patch(id, { ownerApproved: true });
          toast.success(`${supplierName(id)}: approved. Thanks!`);
          maybeApprove(id);
          if (neg(id).status !== 'approved') toast('Waiting for finance approval');
          return { ok: true };
        },
        decideFinance: (id, d) => {
          const n = neg(id);
          if (n.status !== 'awaiting_approval') {
            return fail(atLeast(n.status, 'approved') ? 'Finance has already decided' : 'Nothing to approve yet: the lead has not sent packages');
          }
          patch(id, { financeDecision: d });
          toast.success(d === 'approved' ? `${supplierName(id)}: commitment approved by finance` : `${supplierName(id)}: commitment rejected; that package will not be offered`);
          maybeApprove(id);
          if (neg(id).status !== 'approved') toast('Waiting for the business owner');
          return { ok: true };
        },
        sendToSupplier: (id) => {
          const n = neg(id);
          if (n.status === 'awaiting_approval') return fail(n.ownerApproved ? 'Waiting for finance approval' : 'Waiting for business owner approval');
          if (n.status !== 'approved') return fail('Packages need approval first');
          patch(id, { status: 'with_supplier' });
          toast.success(`Sent to ${supplierName(id)}`);
          return { ok: true };
        },
        supplierSubmit: (id, pick, counter) => {
          const n = neg(id);
          if (n.status !== 'with_supplier') return fail('There is nothing to respond to yet');
          patch(id, { supplierPick: pick, counter, status: counter ? 'countered' : 'agreed' });
          step(id, 7);
          if (!counter) step(id, 8);
          toast.success('Sent to Procurement');
          return { ok: true };
        },
        acceptCounter: (id) => {
          if (neg(id).status !== 'countered') return fail('No counter-offer to accept');
          patch(id, { status: 'agreed' });
          step(id, 8);
          toast.success('Counter accepted. Ready to sign.');
          return { ok: true };
        },
        declineCounter: (id) => {
          if (neg(id).status !== 'countered') return fail('No counter-offer to decline');
          patch(id, { status: 'agreed', counter: undefined });
          step(id, 8);
          toast.success('Counter declined: the package stands as offered. Ready to sign.');
          return { ok: true };
        },
        sign: (id) => {
          const n = neg(id);
          if (!hasMoneyLines(id)) {
            const pending = legalChanges(id).filter((c) => !n.legalDecisions[c.no]);
            if (!n.sortResult) return fail('Sort the changes first');
            if (pending.length) return fail(`Waiting for legal on ${pending.length} change${pending.length === 1 ? '' : 's'}`);
          } else if (n.status !== 'agreed') {
            return fail('The deal is not agreed yet');
          }
          patch(id, { status: 'signed', signedAt: new Date().toISOString() });
          step(id, 9);
          toast.success(hasMoneyLines(id) ? 'Sent for signature. Trackers are live in Sirion.' : 'Sent for signature.');
          return { ok: true };
        },
        decideLegal: (id, changeNo, d) => {
          patch(id, { legalDecisions: { ...neg(id).legalDecisions, [changeNo]: d } });
          toast.success(`${supplierName(id)}: ${d === 'rejected' ? 'rejected, current wording stays' : d === 'accepted' ? 'accepted' : 'sent back with a redline'}`);
        },
        setKeepAnnualExit: (id, keepAnnualExit) => {
          const n = neg(id);
          if (atLeast(n.status, 'awaiting_approval')) {
            toast('Packages are locked once they are sent for approval');
            return;
          }
          // A 3-year term breaks the annual exit, so packages with one leave the offer (and come back when the preference is off).
          const multiYear = buildPackages({ redlineId: id }).filter((p) => p.gives.some((g) => g.id === 'term_3y')).map((p) => p.id);
          const without = n.selectedPackages.filter((p) => !multiYear.includes(p));
          const selectedPackages = keepAnnualExit
            ? without.length ? without : n.selectedPackages
            : ([...new Set([...n.selectedPackages, ...multiYear])].sort() as PackageId[]);
          patch(id, { keepAnnualExit, selectedPackages });
          if (keepAnnualExit && without.length < n.selectedPackages.length) toast(`Package ${multiYear.join(', ')} removed from the offer: no annual exit for 3 years`);
        },
        saveCreditDraft: (id, creditDraft) => {
          const n = neg(id);
          if (atLeast(n.status, 'awaiting_approval')) {
            toast('Offers are locked once they are sent for approval');
            return;
          }
          // A new draft replaces the old one; an offer built from the old draft is withdrawn until re-added.
          patch(id, { creditDraft, draftInOffers: false, selectedPackages: n.selectedPackages.filter((p) => p !== 'E') });
          if (creditDraft) {
            step(id, 4);
            toast.success('Saved to your draft offer');
          }
        },
        runInvoiceCheck: (id) => {
          if (neg(id).status !== 'signed') return fail('Sign the deal first: the check runs on the first invoice after signature');
          patch(id, { invoiceChecked: true });
          step(id, 10);
          return { ok: true };
        },
        reset: () => {
          set({ role: 'lead', negotiations: initialNegotiations(), completedSteps: [], signedIn: false, welcomeDismissed: false, data: { usePeerBenchmarks: true, contributeOutcomes: false }, profile: DEFAULT_PROFILE, guideOpen: false });
          toast('Demo reset');
        },
      };
    },
    {
      name: 'cost-of-yes-demo',
      version: 4,
      // Older saved demos predate per-redline state and sign-in: start them fresh.
      migrate: () => ({}) as never,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        role: s.role, negotiations: s.negotiations, completedSteps: s.completedSteps,
        signedIn: s.signedIn, welcomeDismissed: s.welcomeDismissed, data: s.data, profile: s.profile,
      }),
      // Redlines added after a demo was saved still get a starting state.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DemoState>;
        return { ...current, ...p, negotiations: { ...initialNegotiations(), ...(p.negotiations ?? {}) } };
      },
    },
  ),
);

/** One redline's negotiation state. */
export function useNegotiation(redlineId: string): Negotiation {
  return useDemo((s) => s.negotiations[redlineId]) ?? initialNegotiations()[redlineId];
}
