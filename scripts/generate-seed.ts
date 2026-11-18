/**
 * Deterministic seed generator (BUILD_SPEC §5.2–§5.3).
 * Writes data/contracts.json, invoices.json, service_events.json, renewals.json.
 * pooled_rates, wording_library, redlines, package_templates, kpi_history and
 * learning are hand-written JSON.
 *
 * Run with: npm run seed
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Contract, InvoiceLine, Renewal, ServiceEvent, SupplierType } from '../lib/types';

// ---------- PRNG ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

// ---------- Dates ----------
const TODAY = new Date(Date.UTC(2026, 10, 18)); // 18 Nov 2026
function addMonths(d: Date, m: number) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + m);
  return r;
}
function endOfMonth(y: number, m0: number) {
  return new Date(Date.UTC(y, m0 + 1, 0));
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

// ---------- Software contracts (hand-designed to hit §5.3 exactly) ----------
type R = 'A' | 'B' | 'O'; // A = notice 60/90, B = notice 15/30, O = opt-in
type P = 'open' | 'cap5' | 'fixed';
interface SwRow {
  id: string;
  name: string;
  r: R;
  notice: number | null;
  claim: number | null; // null = automatic credits
  price: P;
  rise: number; // year-2 vs year-1 price rise
  seats: number;
  perSeat: number; // ₹ per seat per year
  unreviewedUnused?: number; // set => past renewal was NOT reviewed, with this unused share
  monthsAhead: number; // contract end, months from today
  owner: string;
}

const OWNERS = [
  'Priya Nair', 'Arjun Mehta', 'Kavya Rao', 'Rohan Iyer', 'Meera Shah',
  'Vikram Desai', 'Ananya Bose', 'Sameer Kulkarni', 'Neha Joshi', 'Karan Malhotra',
];

const SOFTWARE: SwRow[] = [
  { id: 'C-001', name: 'Ledgerly', r: 'A', notice: 90, claim: 10, price: 'open', rise: 0.08, seats: 300, perSeat: 9600, unreviewedUnused: 0.12, monthsAhead: 5, owner: 'Rohan Iyer' },
  { id: 'C-002', name: 'PayrollPro', r: 'B', notice: 30, claim: null, price: 'cap5', rise: 0.05, seats: 200, perSeat: 8400, monthsAhead: 2, owner: 'Meera Shah' },
  { id: 'C-003', name: 'DataVault', r: 'A', notice: 60, claim: 7, price: 'cap5', rise: 0.05, seats: 400, perSeat: 6000, monthsAhead: 4, owner: 'Vikram Desai' },
  { id: 'C-004', name: 'Nimbus HR Cloud', r: 'A', notice: 90, claim: 10, price: 'open', rise: 0.09, seats: 200, perSeat: 12000, unreviewedUnused: 0.15, monthsAhead: 6, owner: 'Kavya Rao' },
  { id: 'C-005', name: 'SecureSign', r: 'O', notice: null, claim: null, price: 'fixed', rise: 0, seats: 100, perSeat: 14400, monthsAhead: 9, owner: 'Arjun Mehta' },
  { id: 'C-006', name: 'InsightBI', r: 'B', notice: 15, claim: 5, price: 'cap5', rise: 0.05, seats: 100, perSeat: 12000, monthsAhead: 3, owner: 'Neha Joshi' },
  { id: 'C-007', name: 'CloudOps Suite', r: 'A', notice: 90, claim: null, price: 'open', rise: 0.1, seats: 300, perSeat: 14400, monthsAhead: 7, owner: 'Karan Malhotra' },
  { id: 'C-008', name: 'TalentLoop', r: 'B', notice: 30, claim: 10, price: 'open', rise: 0.11, seats: 200, perSeat: 9600, unreviewedUnused: 0.18, monthsAhead: 4, owner: 'Kavya Rao' },
  { id: 'C-009', name: 'MailForge', r: 'A', notice: 60, claim: null, price: 'cap5', rise: 0.05, seats: 500, perSeat: 6000, monthsAhead: 8, owner: 'Sameer Kulkarni' },
  { id: 'C-010', name: 'HelpHub', r: 'A', notice: 60, claim: 5, price: 'cap5', rise: 0.05, seats: 200, perSeat: 8400, monthsAhead: 3, owner: 'Ananya Bose' },
  { id: 'C-011', name: 'CodeHarbor', r: 'B', notice: 30, claim: null, price: 'fixed', rise: 0, seats: 300, perSeat: 12000, monthsAhead: 10, owner: 'Arjun Mehta' },
  { id: 'C-012', name: 'DocuNest', r: 'A', notice: 90, claim: 7, price: 'open', rise: 0.11, seats: 100, perSeat: 9600, unreviewedUnused: 0.21, monthsAhead: 5, owner: 'Priya Nair' },
  { id: 'C-013', name: 'ChatBridge', r: 'O', notice: null, claim: 10, price: 'cap5', rise: 0.05, seats: 200, perSeat: 6000, monthsAhead: 12, owner: 'Neha Joshi' },
  { id: 'C-014', name: 'AssetIQ', r: 'B', notice: 15, claim: null, price: 'cap5', rise: 0.04, seats: 100, perSeat: 8400, monthsAhead: 6, owner: 'Vikram Desai' },
  { id: 'C-015', name: 'BillSmart', r: 'A', notice: 90, claim: 10, price: 'open', rise: 0.12, seats: 400, perSeat: 8400, unreviewedUnused: 0.24, monthsAhead: 8, owner: 'Meera Shah' },
  { id: 'C-016', name: 'ProjectPilot', r: 'B', notice: 30, claim: 7, price: 'fixed', rise: 0, seats: 300, perSeat: 6000, monthsAhead: 11, owner: 'Rohan Iyer' },
  { id: 'C-017', name: 'CloudDesk', r: 'B', notice: 30, claim: null, price: 'fixed', rise: 0, seats: 500, perSeat: 12000, monthsAhead: 2, owner: 'Ananya Bose' },
  { id: 'C-018', name: 'SurveySpark', r: 'A', notice: 60, claim: null, price: 'cap5', rise: 0.04, seats: 100, perSeat: 6000, monthsAhead: 13, owner: 'Karan Malhotra' },
  { id: 'C-019', name: 'LearnLane', r: 'B', notice: 30, claim: 5, price: 'open', rise: 0.12, seats: 600, perSeat: 6000, monthsAhead: 7, owner: 'Sameer Kulkarni' },
  { id: 'C-020', name: 'VaultKey', r: 'A', notice: 90, claim: 10, price: 'cap5', rise: 0.04, seats: 200, perSeat: 14400, monthsAhead: 15, owner: 'Priya Nair' },
  { id: 'C-021', name: 'MeetSphere', r: 'O', notice: null, claim: null, price: 'fixed', rise: 0, seats: 800, perSeat: 6000, monthsAhead: 14, owner: 'Ananya Bose' },
  { id: 'C-023', name: 'FormFlow', r: 'B', notice: 15, claim: 7, price: 'open', rise: 0.13, seats: 100, perSeat: 6000, monthsAhead: 9, owner: 'Neha Joshi' },
  { id: 'C-024', name: 'SyncPoint', r: 'A', notice: 60, claim: 10, price: 'cap5', rise: 0.04, seats: 300, perSeat: 8400, monthsAhead: 16, owner: 'Vikram Desai' },
  { id: 'C-025', name: 'TaskTrail', r: 'B', notice: 30, claim: null, price: 'fixed', rise: 0, seats: 200, perSeat: 9600, monthsAhead: 18, owner: 'Rohan Iyer' },
  { id: 'C-026', name: 'QueryNest', r: 'A', notice: 90, claim: null, price: 'open', rise: 0.13, seats: 200, perSeat: 8400, unreviewedUnused: 0.18, monthsAhead: 17, owner: 'Karan Malhotra' },
];

// QueryNest's unreviewed renewal is in the 60–90 group; the ≤30 group's single
// unreviewed renewal is TalentLoop (0.18). The 60–90 group's five shares are
// 0.12, 0.15, 0.21, 0.24 and 0.18 → spec values 0.12–0.24, mean 0.18 overall.

// ---------- Other supplier types ----------
interface OtherRow {
  id: string;
  name: string;
  type: Exclude<SupplierType, 'software'>;
  fixed?: Partial<Contract>;
}
const OTHERS: OtherRow[] = [
  { id: 'C-022', name: 'SwiftShip Logistics', type: 'logistics', fixed: { annualFeeInr: 3_600_000, renewalWording: 'opt_in', noticeDays: null, creditWording: 'claim_based', claimWindowDays: 15, priceWording: 'capped', priceCapPct: 5, paymentDays: 45 } },
  { id: 'C-027', name: 'BrightStaff Services', type: 'staffing' },
  { id: 'C-028', name: 'CleanCo Facilities', type: 'facilities' },
  { id: 'C-029', name: 'TalentBridge Staffing', type: 'staffing' },
  { id: 'C-030', name: 'RapidRoute Freight', type: 'logistics' },
  { id: 'C-031', name: 'PeopleFirst Contractors', type: 'staffing' },
  { id: 'C-032', name: 'GreenGuard Housekeeping', type: 'facilities' },
  { id: 'C-033', name: 'CargoLine Movers', type: 'logistics' },
  { id: 'C-034', name: 'SkillSource India', type: 'staffing' },
  { id: 'C-035', name: 'SafeNest Security Services', type: 'facilities' },
  { id: 'C-036', name: 'MetroHaul Logistics', type: 'logistics' },
  { id: 'C-037', name: 'ProTemp Workforce', type: 'staffing' },
  { id: 'C-038', name: 'UrbanFix Maintenance', type: 'facilities' },
  { id: 'C-039', name: 'Northwind Express', type: 'logistics' },
  { id: 'C-040', name: 'CoreStaff Solutions', type: 'staffing' },
];

// ---------- Build contracts ----------
const contracts: Contract[] = [];

for (const s of SOFTWARE) {
  const endBase = addMonths(TODAY, s.monthsAhead);
  const end = endOfMonth(endBase.getUTCFullYear(), endBase.getUTCMonth());
  const start = addMonths(new Date(end.getTime() + 86400000), -36);
  contracts.push({
    id: s.id,
    supplier: s.name,
    supplierType: 'software',
    annualFeeInr: s.seats * s.perSeat,
    seats: s.seats,
    startDate: iso(start),
    endDate: iso(end),
    renewalWording: s.r === 'O' ? 'opt_in' : 'auto_renew',
    noticeDays: s.notice,
    creditWording: s.claim === null ? 'automatic' : 'claim_based',
    claimWindowDays: s.claim,
    priceWording: s.price === 'open' ? 'open_yearly' : s.price === 'cap5' ? 'capped' : 'fixed',
    priceCapPct: s.price === 'cap5' ? 5 : null,
    paymentDays: s.id === 'C-017' ? 45 : s.id === 'C-004' ? 30 : pick([30, 45, 60] as const),
    businessOwner: s.owner,
  });
}

for (const o of OTHERS) {
  const monthsAhead = 2 + Math.floor(rand() * 17);
  const endBase = addMonths(TODAY, monthsAhead);
  const end = endOfMonth(endBase.getUTCFullYear(), endBase.getUTCMonth());
  const start = addMonths(new Date(end.getTime() + 86400000), -36);
  const auto = rand() < 0.6;
  const claim = rand() < 0.6;
  const priceRoll = rand();
  const base: Contract = {
    id: o.id,
    supplier: o.name,
    supplierType: o.type,
    annualFeeInr: Math.round(between(8, 60)) * 100_000,
    startDate: iso(start),
    endDate: iso(end),
    renewalWording: auto ? 'auto_renew' : 'opt_in',
    noticeDays: auto ? pick([15, 30, 60, 90] as const) : null,
    creditWording: claim ? 'claim_based' : 'automatic',
    claimWindowDays: claim ? pick([7, 10, 15, 30] as const) : null,
    priceWording: priceRoll < 0.35 ? 'open_yearly' : priceRoll < 0.75 ? 'capped' : 'fixed',
    priceCapPct: null,
    paymentDays: pick([30, 45, 60] as const),
    businessOwner: pick(OWNERS),
  };
  if (base.priceWording === 'capped') base.priceCapPct = pick([5, 7] as const);
  contracts.push({ ...base, ...o.fixed });
}
contracts.sort((a, b) => a.id.localeCompare(b.id));

// ---------- Invoices: 24 monthly lines per contract (Nov 2024 – Oct 2026) ----------
const invoices: InvoiceLine[] = [];
const swById = new Map(SOFTWARE.map((s) => [s.id, s]));
for (const c of contracts) {
  const sw = swById.get(c.id);
  const rise = sw ? sw.rise : c.priceWording === 'fixed' ? 0 : Math.round(between(0.02, 0.1) * 100) / 100;
  const qty = sw ? sw.seats : 1;
  const unitY1 = sw ? sw.perSeat / 12 : Math.round(c.annualFeeInr / 12);
  for (let k = 0; k < 24; k++) {
    const d = new Date(Date.UTC(2024, 10 + k, 1));
    const unit = k < 12 ? unitY1 : Math.round(unitY1 * (1 + rise));
    invoices.push({
      id: `INV-${c.id.slice(2)}-${String(k + 1).padStart(2, '0')}`,
      contractId: c.id,
      date: iso(d),
      item: sw ? 'Subscription seats (monthly)' : c.supplierType === 'staffing' ? 'Contract staff (monthly)' : c.supplierType === 'logistics' ? 'Freight services (monthly)' : 'Facility services (monthly)',
      qty,
      agreedUnitPriceInr: unit,
      invoicedUnitPriceInr: unit,
    });
  }
}

// ---------- Service events: 25 software × 12 months (Nov 2025 – Oct 2026) ----------
const serviceEvents: ServiceEvent[] = [];
const MONTHS = Array.from({ length: 12 }, (_, k) => {
  const d = new Date(Date.UTC(2025, 10 + k, 1));
  return d.toISOString().slice(0, 7);
});
// CloudDesk: ₹4,50,000 owed over 12 months, spread over 7 breach months.
const CLOUDDESK_OWED = [60_000, 0, 45_000, 90_000, 0, 30_000, 0, 75_000, 0, 60_000, 0, 90_000];

for (const s of SOFTWARE) {
  const fee = s.seats * s.perSeat;
  MONTHS.forEach((month, k) => {
    let owed: number;
    if (s.id === 'C-017') owed = CLOUDDESK_OWED[k];
    else owed = rand() < 0.45 ? Math.round((fee * between(0.004, 0.012)) / 1000) * 1000 : 0;
    const target = 99.5;
    const actual = owed > 0 ? Math.round(between(97.8, 99.4) * 100) / 100 : Math.round(between(99.5, 99.98) * 100) / 100;
    serviceEvents.push({ contractId: s.id, month, target, actual, creditOwedInr: owed, creditReceivedInr: 0 });
  });
}

// Received credits: hit the recovery ratio exactly per credits group.
function fillReceived(ids: string[], ratio: number, noise: number) {
  const rows = serviceEvents.filter((e) => ids.includes(e.contractId) && e.creditOwedInr > 0);
  for (const r of rows) {
    const rr = Math.min(1, Math.max(0, ratio + between(-noise, noise)));
    r.creditReceivedInr = Math.round((r.creditOwedInr * rr) / 100) * 100;
  }
  const owed = rows.reduce((a, r) => a + r.creditOwedInr, 0);
  const got = rows.reduce((a, r) => a + r.creditReceivedInr, 0);
  let diff = Math.round(ratio * owed) - got;
  // Push the residual into rows (largest owed first) without breaking 0 ≤ received ≤ owed.
  const byOwed = [...rows].sort((a, b) => b.creditOwedInr - a.creditOwedInr);
  for (const r of byOwed) {
    if (diff === 0) break;
    const room = diff > 0 ? r.creditOwedInr - r.creditReceivedInr : -r.creditReceivedInr;
    const step = diff > 0 ? Math.min(diff, room) : Math.max(diff, room);
    r.creditReceivedInr += step;
    diff -= step;
  }
}
const autoIds = SOFTWARE.filter((s) => s.claim === null).map((s) => s.id);
const claimIds = SOFTWARE.filter((s) => s.claim !== null).map((s) => s.id);
fillReceived(autoIds, 0.94, 0.05);
fillReceived(claimIds, 0.22, 0.2);

// ---------- Renewals: one past renewal per software auto-renew contract ----------
const renewals: Renewal[] = [];
for (const s of SOFTWARE) {
  if (s.r === 'O') continue;
  const c = contracts.find((x) => x.id === s.id)!;
  const renewalDate = iso(addMonths(new Date(c.endDate), -24));
  const unused = s.unreviewedUnused ?? Math.round(between(0.02, 0.1) * 100) / 100;
  renewals.push({
    contractId: s.id,
    renewalDate,
    reviewed: s.unreviewedUnused === undefined,
    seatsPaid: s.seats,
    seatsUsed: Math.round(s.seats * (1 - unused)),
  });
}

// ---------- Write ----------
const out = path.join(process.cwd(), 'data');
fs.mkdirSync(out, { recursive: true });
const write = (f: string, v: unknown) => fs.writeFileSync(path.join(out, f), JSON.stringify(v, null, 2) + '\n');
write('contracts.json', contracts);
write('invoices.json', invoices);
write('service_events.json', serviceEvents);
write('renewals.json', renewals);
console.log(
  `seed: ${contracts.length} contracts, ${invoices.length} invoice lines, ${serviceEvents.length} service events, ${renewals.length} renewals`,
);
