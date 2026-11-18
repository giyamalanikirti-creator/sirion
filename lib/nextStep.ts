import { getContract, getRedline } from './data';
import { firstInvoiceCheck } from './engines/invoiceCheck';
import { priceCounter, templateFor } from './engines/negotiation';
import { pricePackage } from './engines/givegetEngine';
import { changedLines, supplierAsk } from './engines/redline';
import { COUNTER_PHRASE, formatLakh } from './format';
import { dealFor, extraTemplates, offersFor } from './offers';
import { financePackages, hasMoneyLines, legalChanges, type Negotiation } from './store';

export type Turn = 'you' | 'owner' | 'finance' | 'supplier' | 'legal' | 'sirion' | 'done';

export type ActionId =
  | 'analyse' | 'impact' | 'offers' | 'sendApproval' | 'viewOwner' | 'viewFinance'
  | 'sendSupplier' | 'viewSupplier' | 'respondCounter' | 'sign' | 'invoice' | 'viewLegal';

export interface NextStep {
  turn: Turn;
  /** Who acts, in words ("Your turn", "Finance's turn"). */
  whose: string;
  /** What they are deciding or doing. */
  title: string;
  detail?: string;
  /** What happens after this. */
  next?: string;
  action?: ActionId;
  actionLabel?: string;
}

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const inWords = (n: number) => NUM[n] ?? String(n);
export const InWords = (n: number) => {
  const w = inWords(n);
  return w[0].toUpperCase() + w.slice(1);
};

/** The single next action for a redline, and whose turn it is. Drives the board, the work queue and the dashboard. */
export function nextStep(redlineId: string, n: Negotiation): NextStep {
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  const name = r.supplier;
  const money = hasMoneyLines(redlineId);
  const total = r.changes.length;

  if (n.status === 'received') {
    return {
      turn: 'you', whose: 'Your turn', action: 'analyse', actionLabel: `Analyse ${total} change${total === 1 ? '' : 's'}`,
      title: `Find out which of ${name}’s ${inWords(total)} changes affect what you pay`,
      detail: 'Routine edits are logged, legal changes go to legal, and every commercial change gets an estimated cost.',
      next: money ? 'You see the financial impact of each commercial change.' : 'Legal reviews the changes.',
    };
  }

  if (!money) {
    const pending = legalChanges(redlineId).filter((ch) => !n.legalDecisions[ch.no]).length;
    if (n.status === 'signed') return { turn: 'done', whose: 'Done', title: 'Signed. No commercial terms changed.' };
    if (pending) {
      return {
        turn: 'legal', whose: 'Legal’s turn', action: 'viewLegal', actionLabel: 'View as Legal',
        title: `Waiting for Legal to decide ${inWords(pending)} change${pending === 1 ? '' : 's'}`,
        detail: 'Nothing here changes what you pay, so there is nothing to price or negotiate.',
        next: 'You send the agreement for signature.',
      };
    }
    return {
      turn: 'you', whose: 'Your turn', action: 'sign', actionLabel: 'Send for signature',
      title: 'Legal has decided every change. Send the agreement for signature.',
      next: 'The renewal is signed.',
    };
  }

  const lines = changedLines(r);
  switch (n.status) {
    case 'sorted':
      return {
        turn: 'you', whose: 'Your turn', action: 'impact', actionLabel: 'See the financial impact',
        title: `See what ${inWords(lines.length)} commercial change${lines.length === 1 ? '' : 's'} could cost`,
        detail: 'Each estimate compares the change with your current contract, with the evidence behind it.',
        next: `You compare offers to send back to ${name}.`,
      };
    case 'priced':
      return {
        turn: 'you', whose: 'Your turn', action: 'offers', actionLabel: 'Compare offers',
        title: `Decide what to offer ${name} in return for keeping your terms`,
        next: 'You send your chosen offers for approval.',
      };
    case 'packages_ready': {
      const fin = financePackages(redlineId, n.selectedPackages);
      return {
        turn: 'you', whose: 'Your turn', action: 'sendApproval', actionLabel: 'Send offers for approval',
        title: `Send ${n.selectedPackages.length === 1 ? 'offer' : 'offers'} ${n.selectedPackages.join(', ')} for approval`,
        next: `${c.businessOwner}, the business owner, approves${fin.length ? `, then Finance decides on the three-year commitment in offer ${fin.join(', ')}` : ''}.`,
      };
    }
    case 'awaiting_approval': {
      const fin = financePackages(redlineId, n.selectedPackages);
      if (!n.ownerApproved) {
        return {
          turn: 'owner', whose: 'Business owner’s turn', action: 'viewOwner', actionLabel: 'View as business owner',
          title: `Waiting for ${c.businessOwner}, the business owner, to approve the offers`,
          detail: 'They see a short card: what we could get back, what we might give, and what legal is handling.',
          next: fin.length ? 'Finance decides on the three-year commitment.' : `You send the offers to ${name}.`,
        };
      }
      const commit = offersFor(redlineId, n).find((p) => fin.includes(p.id))?.commitmentLakh ?? 0;
      return {
        turn: 'finance', whose: 'Finance’s turn', action: 'viewFinance', actionLabel: 'View as Finance',
        title: `Waiting for Finance to approve the three-year commitment (${formatLakh(commit)})`,
        detail: `Offer ${fin.join(', ')} commits the company for three years. Other gives are under the ₹5 lakh limit and need no finance step.`,
        next: `You send the approved offers to ${name}.`,
      };
    }
    case 'approved':
      return {
        turn: 'you', whose: 'Your turn', action: 'sendSupplier', actionLabel: `Send to ${name}`,
        title: `Send the approved offers (${n.selectedPackages.join(', ')}) to ${name}`,
        detail: n.financeDecision === 'rejected' ? 'Finance rejected the three-year commitment, so that offer is not included.' : 'Preview the supplier view first: plain terms and reasons, no ₹ figures.',
        next: `${name} picks one offer and may suggest one change.`,
      };
    case 'with_supplier':
      return {
        turn: 'supplier', whose: `${name}’s turn`, action: 'viewSupplier', actionLabel: 'View as supplier',
        title: `Waiting for ${name} to choose an offer`,
        detail: 'They see each offer in plain words with a reason per term. No ₹ figures, no peer data.',
        next: 'You review their choice and any change they suggest.',
      };
    case 'countered': {
      if (!n.counter || !n.supplierPick) break;
      const pkg = pricePackage(c, supplierAsk(r, c), templateFor(n.supplierPick, redlineId, extraTemplates(redlineId, n)), lines);
      const pc = priceCounter(n.counter.line, pkg.wordings[n.counter.line], n.counter.group, redlineId);
      return {
        turn: 'you', whose: 'Your turn', action: 'respondCounter', actionLabel: 'Accept',
        title: `${name} picked offer ${n.supplierPick} and asked for ${COUNTER_PHRASE[n.counter.group] ?? 'one change'}`,
        detail: `That costs an estimated ${formatLakh(pc.extraLakh)} a year more, ${pc.insideRange ? 'inside' : 'outside'} your ${formatLakh(pc.rangeLakh)} range per term.`,
        next: 'You send the agreement for signature.',
      };
    }
    case 'agreed':
      return {
        turn: 'you', whose: 'Your turn', action: 'sign', actionLabel: 'Send for signature',
        title: `Agreed with ${name} on offer ${n.supplierPick}${n.counter ? ` with ${COUNTER_PHRASE[n.counter.group]}` : ''}`,
        next: 'Sirion starts checking invoices against the signed terms.',
      };
    case 'signed': {
      const check = firstInvoiceCheck(r.contractId);
      const deal = n.supplierPick ? dealFor(redlineId, { ...n, supplierPick: n.supplierPick }) : undefined;
      if (check && !n.invoiceChecked) {
        return {
          turn: 'sirion', whose: 'Sirion’s turn', action: 'invoice', actionLabel: 'Run the first invoice check',
          title: `The first invoice from ${name} has arrived`,
          detail: 'Sirion compares it with the signed credit clause and last month’s service levels.',
          next: 'Anything missing is flagged for follow-up with an owner.',
        };
      }
      return {
        turn: 'done', whose: 'Signed',
        title: deal ? `${deal.enforceableCount} of ${deal.totalLines} signed commercial terms have an automated check` : 'Signed',
        detail: check && n.invoiceChecked ? 'A missing credit on the first invoice is flagged for follow-up.' : undefined,
      };
    }
  }
  return { turn: 'you', whose: 'Your turn', title: 'Review the redline' };
}
