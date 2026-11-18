import { getContract, getRedline } from './data';
import { buildPackages, draftOfferTemplate } from './engines/givegetEngine';
import { finalDeal } from './engines/negotiation';
import { supplierAsk } from './engines/redline';
import type { PackageTemplate, PricedPackage } from './types';

/** The parts of a negotiation that decide which offers exist. */
export interface OfferState {
  creditDraft?: PackageTemplate['wordings']['credits'];
  draftInOffers?: boolean;
  supplierPick?: PricedPackage['id'];
  counter?: { line: 'renewal' | 'credits' | 'price'; group: string };
}

/** Offers the lead built herself: today, the saved credits what-if. */
export function extraTemplates(redlineId: string, n?: OfferState): PackageTemplate[] {
  if (!n?.draftInOffers || !n.creditDraft) return [];
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  return [draftOfferTemplate(c, supplierAsk(r, c), n.creditDraft)];
}

/** Every offer for a redline, including the lead's own counter if she added it. */
export function offersFor(redlineId: string, n?: OfferState): PricedPackage[] {
  return buildPackages({ redlineId, extra: extraTemplates(redlineId, n) });
}

/** The final deal for a negotiation that has a supplier pick. */
export function dealFor(redlineId: string, n: OfferState & { supplierPick: PricedPackage['id'] }) {
  return finalDeal(n.supplierPick, n.counter ? [n.counter as never] : [], redlineId, extraTemplates(redlineId, n));
}
