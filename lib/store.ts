'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { Counter, PackageId, SortResult } from './types';

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
  sorted: 'Sorted',
  priced: 'Priced',
  packages_ready: 'Packages ready',
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
  supplier: '/portal/clouddesk',
};

type Result = { ok: boolean; message?: string };

interface DemoState {
  role: Role;
  status: Status;
  sortResult?: SortResult;
  selectedPackages: PackageId[];
  ownerApproved: boolean;
  financeDecision?: { A: 'approved' | 'rejected' };
  supplierPick?: PackageId;
  counter?: Counter;
  legalDecision?: 'accepted' | 'rejected' | 'redlined';
  signedAt?: string;
  completedSteps: number[];

  setRole: (r: Role) => void;
  completeStep: (n: number) => void;
  sort: (r: SortResult) => Result;
  markPriced: () => void;
  togglePackage: (id: PackageId) => void;
  viewPackages: () => void;
  sendForApproval: () => Result;
  approveOwner: () => Result;
  decideFinance: (d: 'approved' | 'rejected') => Result;
  sendToSupplier: () => Result;
  supplierSubmit: (pick: PackageId, counter?: Counter) => Result;
  acceptCounter: () => Result;
  sign: () => Result;
  decideLegal: (d: 'accepted' | 'rejected' | 'redlined') => void;
  reset: () => void;
}

const initial = {
  role: 'lead' as Role,
  status: 'received' as Status,
  sortResult: undefined,
  selectedPackages: ['A', 'B', 'C'] as PackageId[],
  ownerApproved: false,
  financeDecision: undefined,
  supplierPick: undefined,
  counter: undefined,
  legalDecision: undefined,
  signedAt: undefined,
  completedSteps: [] as number[],
};

const fail = (message: string): Result => {
  toast(message);
  return { ok: false, message };
};

/** Packages that still need a finance decision before the deal is approved. */
export const needsFinanceStep = (selected: PackageId[]) => selected.includes('A');

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => {
      const step = (n: number) => {
        const s = get().completedSteps;
        if (!s.includes(n)) set({ completedSteps: [...s, n].sort((a, b) => a - b) });
      };
      const maybeApprove = () => {
        const s = get();
        if (s.status !== 'awaiting_approval' || !s.ownerApproved) return;
        if (needsFinanceStep(s.selectedPackages) && !s.financeDecision) return;
        const selected = s.financeDecision?.A === 'rejected' ? s.selectedPackages.filter((p) => p !== 'A') : s.selectedPackages;
        set({ status: 'approved', selectedPackages: selected });
        step(5);
      };

      return {
        ...initial,
        setRole: (role) => set({ role }),
        completeStep: step,

        sort: (sortResult) => {
          const s = get().status;
          if (s !== 'received' && s !== 'sorted') return { ok: true };
          set({ sortResult, status: 'sorted' });
          step(2);
          return { ok: true };
        },
        markPriced: () => {
          if (get().status === 'sorted') set({ status: 'priced' });
        },
        togglePackage: (id) => {
          const s = get();
          if (atLeast(s.status, 'awaiting_approval')) {
            toast('Packages are locked once they are sent for approval');
            return;
          }
          const has = s.selectedPackages.includes(id);
          if (has && s.selectedPackages.length === 1) {
            toast('Keep at least one package');
            return;
          }
          set({ selectedPackages: has ? s.selectedPackages.filter((p) => p !== id) : [...s.selectedPackages, id].sort() as PackageId[] });
        },
        viewPackages: () => {
          if (get().status === 'priced') set({ status: 'packages_ready' });
        },
        sendForApproval: () => {
          const s = get().status;
          if (s === 'received' || s === 'sorted') return fail('Sort the changes and check the price tags first');
          if (atLeast(s, 'awaiting_approval')) return fail('Already sent for approval');
          set({ status: 'awaiting_approval' });
          step(4);
          toast.success('Sent to the business owner for approval');
          return { ok: true };
        },
        approveOwner: () => {
          const s = get();
          if (s.status !== 'awaiting_approval') {
            return fail(atLeast(s.status, 'approved') ? 'Already approved' : 'Nothing to approve yet: the lead has not sent packages');
          }
          set({ ownerApproved: true });
          toast.success('Approved. Thanks!');
          maybeApprove();
          if (get().status !== 'approved') toast('Waiting for finance approval');
          return { ok: true };
        },
        decideFinance: (d) => {
          const s = get();
          if (s.status !== 'awaiting_approval') {
            return fail(atLeast(s.status, 'approved') ? 'Finance has already decided' : 'Nothing to approve yet: the lead has not sent packages');
          }
          set({ financeDecision: { A: d } });
          toast.success(d === 'approved' ? 'Package A approved by finance' : 'Package A rejected: it will not be offered');
          maybeApprove();
          if (get().status !== 'approved') toast('Waiting for the business owner');
          return { ok: true };
        },
        sendToSupplier: () => {
          const s = get();
          if (s.status === 'awaiting_approval') return fail(s.ownerApproved ? 'Waiting for finance approval' : 'Waiting for business owner approval');
          if (s.status !== 'approved') return fail('Packages need approval first');
          set({ status: 'with_supplier' });
          toast.success('Sent to CloudDesk');
          return { ok: true };
        },
        supplierSubmit: (pick, counter) => {
          const s = get();
          if (s.status !== 'with_supplier') return fail('There is nothing to respond to yet');
          set({ supplierPick: pick, counter, status: counter ? 'countered' : 'agreed' });
          step(6);
          if (!counter) step(7);
          toast.success('Sent to Procurement');
          return { ok: true };
        },
        acceptCounter: () => {
          if (get().status !== 'countered') return fail('No counter-offer to accept');
          set({ status: 'agreed' });
          step(7);
          toast.success('Counter accepted. Ready to sign.');
          return { ok: true };
        },
        sign: () => {
          if (get().status !== 'agreed') return fail('The deal is not agreed yet');
          set({ status: 'signed', signedAt: new Date().toISOString() });
          step(8);
          toast.success('Sent for signature. Trackers are live in Sirion.');
          return { ok: true };
        },
        decideLegal: (legalDecision) => {
          set({ legalDecision });
          toast.success(
            legalDecision === 'rejected' ? 'Rejected: liability cap stays at 12 months’ fees' : legalDecision === 'accepted' ? 'Accepted' : 'Sent back with a redline',
          );
        },
        reset: () => {
          set({ ...initial });
          toast('Demo reset');
        },
      };
    },
    {
      name: 'cost-of-yes-demo',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { setRole, completeStep, sort, markPriced, togglePackage, viewPackages, sendForApproval, approveOwner, decideFinance, sendToSupplier, supplierSubmit, acceptCounter, sign, decideLegal, reset, ...data } = s;
        return data;
      },
    },
  ),
);
