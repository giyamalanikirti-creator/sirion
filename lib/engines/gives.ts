import { formatLakh } from '../format';
import { COST_OF_MONEY, FINANCE_CASH_LIMIT_LAKH } from '../settings';
import type { Contract, GiveCost, GiveId } from '../types';
import { feeLakh } from './costEngine';

export const GIVE_LABEL: Record<GiveId, string> = {
  term_3y: '3-year term',
  payment_30: 'Pay in 30 days (not 45)',
  notice_60: '60 days’ notice on renewal',
  claim_30_autofiled: '30-day credit claims, filed automatically',
};

/** Plain-words version for the supplier portal (no ₹, no internal costs). */
export const GIVE_SUPPLIER_LABEL: Record<GiveId, string> = {
  term_3y: 'We commit to a 3-year term',
  payment_30: 'We pay your invoices in 30 days instead of 45',
  notice_60: 'Renewal notice set at 60 days',
  claim_30_autofiled: 'Credits claimed within 30 days, filed through our contract system',
};

export function giveCost(c: Contract, id: GiveId): GiveCost {
  const fee = feeLakh(c);
  switch (id) {
    case 'term_3y': {
      const commitment = 3 * fee;
      return {
        id, label: GIVE_LABEL[id], cashCostLakh: 0, commitmentLakh: commitment, supplierValue: 'high',
        needsFinance: true, financeReason: `Commitment longer than 1 year (${formatLakh(commitment)})`,
      };
    }
    case 'payment_30': {
      const cash = (fee * COST_OF_MONEY * Math.max(0, c.paymentDays - 30)) / 365;
      const needs = cash > FINANCE_CASH_LIMIT_LAKH;
      return {
        id, label: GIVE_LABEL[id], cashCostLakh: cash, commitmentLakh: 0, supplierValue: 'medium',
        needsFinance: needs,
        financeReason: needs
          ? `Cash cost above ${formatLakh(FINANCE_CASH_LIMIT_LAKH)} a year`
          : `${formatLakh(cash)} a year · under ${formatLakh(FINANCE_CASH_LIMIT_LAKH)} limit · no finance step`,
      };
    }
    case 'notice_60':
      return {
        id, label: GIVE_LABEL[id], cashCostLakh: 0, commitmentLakh: 0, supplierValue: 'medium',
        needsFinance: false, financeReason: 'No cash cost (shows up in the renewal residual)',
      };
    case 'claim_30_autofiled':
      return {
        id, label: GIVE_LABEL[id], cashCostLakh: 0, commitmentLakh: 0, supplierValue: 'medium',
        needsFinance: false, financeReason: 'No cash cost (shows up in the credits residual)',
      };
  }
}
