export type SupplierType = 'software' | 'staffing' | 'logistics' | 'facilities';
export type Line = 'renewal' | 'credits' | 'price';

export type RenewalGroup = 'opt_in' | 'notice_le_30' | 'notice_60_90';
export type CreditsGroup = 'automatic' | 'claim_le_10' | 'claim_11_30' | 'claim_30_autofiled';
export type PriceGroup = 'fixed' | 'cap_5' | 'cap_7' | 'open_yearly';
export type WordingGroup = RenewalGroup | CreditsGroup | PriceGroup;

export interface Contract {
  id: string; // e.g. 'C-017'
  supplier: string;
  supplierType: SupplierType;
  annualFeeInr: number;
  seats?: number;
  startDate: string; // ISO
  endDate: string; // ISO
  renewalWording: 'auto_renew' | 'opt_in';
  noticeDays: number | null;
  creditWording: 'automatic' | 'claim_based';
  claimWindowDays: number | null;
  priceWording: 'fixed' | 'capped' | 'open_yearly';
  priceCapPct: number | null;
  paymentDays: number;
  businessOwner: string; // fictional name
}

export interface InvoiceLine {
  id: string;
  contractId: string;
  date: string;
  item: string;
  qty: number;
  agreedUnitPriceInr: number;
  invoicedUnitPriceInr: number;
}

export interface ServiceEvent {
  contractId: string;
  month: string; // 'YYYY-MM'
  target: number;
  actual: number;
  creditOwedInr: number;
  creditReceivedInr: number;
}

export interface Renewal {
  contractId: string;
  renewalDate: string;
  reviewed: boolean;
  seatsPaid: number;
  seatsUsed: number;
}

export interface PooledRate {
  supplierType: SupplierType;
  line: Line;
  wordingGroup: WordingGroup;
  companies: number; // must be >= 20 to show
  figure: number; // e.g. 0.60 = 60% of credits unclaimed
  label: string;
}

export interface WordingOption {
  id: string;
  line: Line;
  wordingGroup: WordingGroup;
  text: string;
  plainReason: string; // supplier-facing, no ₹, no other customers
  enforceable: boolean;
  sirionCheck: string;
}

export type ChangeGroup = 'harmless' | 'legal' | 'money';

export interface RedlineChange {
  no: number;
  clause: string;
  title: string;
  oldText: string;
  newText: string;
  expected: { group: ChangeGroup; line?: Line; wordingGroup?: WordingGroup };
}

export interface Redline {
  id: string;
  contractId: string;
  supplier: string;
  supplierType: SupplierType;
  receivedAt: string;
  slug: string; // supplier portal path, e.g. 'clouddesk'
  interactive: boolean;
  changes: RedlineChange[];
  summary?: { harmless: number; legal: number; money: number; atStakeLakh: number };
  status?: string; // display status for non-interactive rows
}

export type GiveId = 'term_3y' | 'payment_30' | 'notice_60' | 'claim_30_autofiled';
export type PackageId = 'A' | 'B' | 'C' | 'D';

export type Wordings = { renewal: RenewalGroup; credits: CreditsGroup; price: PriceGroup };

export interface PackageTemplate {
  id: PackageId;
  name: string;
  gives: GiveId[];
  wordings: Wordings;
}

// ---- Engine outputs ----

export type Confidence = 'high' | 'medium' | 'low' | 'none';

export interface PriceTag {
  line: Line;
  group: WordingGroup;
  costLakh: number;
  confidence: Confidence;
  n: number;
  source: 'own' | 'pooled' | 'assumption';
  proof: string[];
  pooledBackup?: { companies: number; label: string };
}

export interface GiveCost {
  id: GiveId;
  label: string;
  cashCostLakh: number;
  commitmentLakh: number;
  supplierValue: 'high' | 'medium' | 'low';
  needsFinance: boolean;
  financeReason: string;
}

export interface PricedPackage {
  id: PackageId;
  name: string;
  gives: GiveCost[];
  /** Final wording on every line; lines the supplier did not change keep today's wording. */
  wordings: Wordings;
  /** Money lines the supplier changed (the only lines the package negotiates). */
  lines: Line[];
  protectedLakh: number;
  protectedByLine: Record<Line, number>;
  giveCostLakh: number;
  commitmentLakh: number;
  netLakh: number;
  approvals: ('lead' | 'finance')[];
  rank: number;
}

export interface ChangeClass {
  no: number;
  group: ChangeGroup;
  line?: Line | null;
  wordingGroup?: WordingGroup | null;
  confidence: number;
  reason: string;
}

export interface SortResult {
  results: ChangeClass[];
  source: 'live' | 'cached';
}

export interface Counter {
  line: Line;
  group: WordingGroup;
}

export interface FinalDealLine {
  line: Line;
  group: WordingGroup;
  wording: WordingOption;
  residualLakh: number;
  protectedLakh: number;
  enforceable: boolean;
  sirionCheck: string;
  firstCheck: string;
}

export interface FinalDeal {
  packageId: PackageId;
  lines: FinalDealLine[];
  protectedLakh: number;
  giveCostLakh: number;
  netLakh: number;
  enforceableCount: number;
  totalLines: number;
}
