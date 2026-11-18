import { NextResponse } from 'next/server';
import { SortRequestSchema, SortResponseSchema } from '@/lib/schemas';
import { handleError, readJson } from '@/lib/server/http';
import { sortRedline } from '@/lib/server/sorter';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { redlineId } = SortRequestSchema.parse(await readJson(req));
    const result = SortResponseSchema.parse(await sortRedline(redlineId));
    return NextResponse.json(result);
  } catch (err) {
    return handleError('sort', err);
  }
}
