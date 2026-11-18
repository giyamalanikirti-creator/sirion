import { NextResponse } from 'next/server';
import { buildPackages } from '@/lib/engines/givegetEngine';
import { GiveIdSchema } from '@/lib/schemas';
import { handleError } from '@/lib/server/http';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const redlineId = url.searchParams.get('redlineId') ?? 'RL-CLOUDDESK';
    const exclude = (url.searchParams.get('exclude') ?? '').split(',').filter(Boolean).map((g) => GiveIdSchema.parse(g));
    return NextResponse.json({ packages: buildPackages({ redlineId, excludeGives: exclude }) });
  } catch (err) {
    return handleError('packages', err);
  }
}
