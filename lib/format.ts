/**
 * Money formatting rules (BUILD_SPEC §6.6):
 * - lakh to one decimal place
 * - below ₹1 lakh: rupees rounded to the nearest thousand (₹22,000)
 * - ₹1 crore and above: crore to one decimal place
 * Engines work in lakh; format only at the UI edge.
 */
export function formatLakh(lakh: number): string {
  const sign = lakh < -0.000005 ? '−' : '';
  const v = Math.abs(lakh);
  const oneDp = (x: number) => x.toFixed(1).replace(/\.0$/, '');
  if (v >= 99.95) return `${sign}₹${oneDp(v / 100)} crore`;
  if (v >= 0.995) return `${sign}₹${oneDp(v)} lakh`;
  const rupees = Math.round((v * 1e5) / 1000) * 1000;
  if (rupees === 0) return '₹0';
  return `${sign}₹${rupees.toLocaleString('en-IN')}`;
}

/** "₹4.5 lakh a year" */
export const perYear = (lakh: number) => `${formatLakh(lakh)} a year`;

export function formatPct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const GROUP_LABEL: Record<string, string> = {
  opt_in: 'Opt-in renewal',
  notice_le_30: 'Auto-renew, ≤30 days’ notice',
  notice_60_90: 'Auto-renew, 60–90 days’ notice',
  automatic: 'Automatic credits',
  claim_le_10: 'Claim within ≤10 days',
  claim_11_30: 'Claim within 11–30 days',
  claim_30_autofiled: '30-day claim, auto-filed',
  fixed: 'Fixed price',
  cap_5: 'Yearly rise capped at 5%',
  cap_7: 'Yearly rise capped at 7%',
  open_yearly: 'Open yearly revision',
};

export const LINE_LABEL: Record<string, string> = {
  renewal: 'Renewal',
  credits: 'Service credits',
  price: 'Price',
};
