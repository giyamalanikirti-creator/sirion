'use client';

import { createContext, useContext } from 'react';
import { useDemo, useNegotiation } from '@/lib/store';

const RedlineCtx = createContext<string>('RL-CLOUDDESK');
export const RedlineProvider = RedlineCtx.Provider;

/** The redline this board is showing. */
export const useRedlineId = () => useContext(RedlineCtx);

/** The board's negotiation state plus actions bound to its redline. */
export function useBoard() {
  const id = useRedlineId();
  const n = useNegotiation(id);
  const a = useDemo();
  return {
    id,
    n,
    sort: a.sort.bind(null, id),
    markPriced: () => a.markPriced(id),
    togglePackage: (p: Parameters<typeof a.togglePackage>[1]) => a.togglePackage(id, p),
    viewPackages: () => a.viewPackages(id),
    sendForApproval: () => a.sendForApproval(id),
    sendToSupplier: () => a.sendToSupplier(id),
    acceptCounter: () => a.acceptCounter(id),
    declineCounter: () => a.declineCounter(id),
    sign: () => a.sign(id),
    setKeepAnnualExit: (v: boolean) => a.setKeepAnnualExit(id, v),
    saveCreditDraft: (g: Parameters<typeof a.saveCreditDraft>[1]) => a.saveCreditDraft(id, g),
    runInvoiceCheck: () => a.runInvoiceCheck(id),
  };
}
