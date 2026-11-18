import type {
  Contract, InvoiceLine, PackageTemplate, PooledRate, Redline, Renewal, ServiceEvent, WordingOption,
} from './types';
import contractsJson from '@/data/contracts.json';
import invoicesJson from '@/data/invoices.json';
import serviceEventsJson from '@/data/service_events.json';
import renewalsJson from '@/data/renewals.json';
import pooledJson from '@/data/pooled_rates.json';
import wordingJson from '@/data/wording_library.json';
import redlinesJson from '@/data/redlines.json';
import packagesJson from '@/data/package_templates.json';
import kpiJson from '@/data/kpi_history.json';
import learningJson from '@/data/learning.json';

export const contracts = contractsJson as Contract[];
export const invoices = invoicesJson as InvoiceLine[];
export const serviceEvents = serviceEventsJson as ServiceEvent[];
export const renewals = renewalsJson as Renewal[];
export const pooledRates = pooledJson as PooledRate[];
export const wordingLibrary = wordingJson as WordingOption[];
export const redlines = redlinesJson as Redline[];
export const packageTemplates = packagesJson as PackageTemplate[];
export const kpiHistory = kpiJson;
export const learning = learningJson as { line: string; supplier: string; predicted: number; actual: number }[];

export function getContract(id: string): Contract {
  const c = contracts.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown contract ${id}`);
  return c;
}
export function getRedline(id: string): Redline {
  const r = redlines.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown redline ${id}`);
  return r;
}
export function getWording(id: string): WordingOption {
  const w = wordingLibrary.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown wording ${id}`);
  return w;
}
