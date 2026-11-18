import check from '@/data/first_invoice_check.json';
import { getContract, wordingLibrary } from '../data';

/**
 * Simulated first invoice check after signature (credits line).
 * Credit rule: creditPctPerStep of the monthly fee for each full step of uptime below target.
 */
export function firstInvoiceCheck() {
  const c = getContract(check.contractId);
  const clause = wordingLibrary.find((w) => w.id === check.signedWordingId)!;
  const monthlyFeeInr = c.annualFeeInr / 12;
  const shortfall = Math.max(0, check.uptimeTarget - check.uptimeActual);
  const steps = Math.floor(+(shortfall / check.stepPct).toFixed(6));
  const expectedInr = Math.round(steps * check.creditPctPerStep * monthlyFeeInr);
  const foundInr = check.creditFoundOnInvoiceInr;
  const gapInr = expectedInr - foundInr;
  return {
    ...check,
    supplier: c.supplier,
    clause,
    monthlyFeeInr,
    shortfall: +shortfall.toFixed(2),
    steps,
    expectedInr,
    foundInr,
    gapInr,
    status: gapInr > 0 ? ('discrepancy' as const) : ('ok' as const),
  };
}
