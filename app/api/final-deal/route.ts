import { NextResponse } from 'next/server';
import { z } from 'zod';
import { finalDeal } from '@/lib/engines/negotiation';
import { handleError, readJson } from '@/lib/server/http';

const Body = z.object({
  pkg: z.enum(['A', 'B', 'C']),
  counters: z.array(z.object({ line: z.literal('price'), group: z.literal('cap_7') })).default([]),
  redlineId: z.string().default('RL-CLOUDDESK'),
});

export async function POST(req: Request) {
  try {
    const { pkg, counters, redlineId } = Body.parse(await readJson(req));
    return NextResponse.json(finalDeal(pkg, counters, redlineId));
  } catch (err) {
    return handleError('final-deal', err);
  }
}
