import { NextResponse } from 'next/server';
import { redlinePriceTags } from '@/lib/engines/redline';
import { handleError } from '@/lib/server/http';

export async function GET(req: Request) {
  try {
    const redlineId = new URL(req.url).searchParams.get('redlineId') ?? 'RL-CLOUDDESK';
    const { tags, totalLakh, pctOfFee } = redlinePriceTags(redlineId);
    return NextResponse.json({ tags, totalLakh, pctOfFee });
  } catch (err) {
    return handleError('price-tags', err);
  }
}
