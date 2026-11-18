import { NextResponse } from 'next/server';
import { ReasonsRequestSchema, ReasonsResponseSchema } from '@/lib/schemas';
import { handleError, readJson } from '@/lib/server/http';
import { writeReasons } from '@/lib/server/reasons';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { wordingOptionIds } = ReasonsRequestSchema.parse(await readJson(req));
    return NextResponse.json(ReasonsResponseSchema.parse(await writeReasons(wordingOptionIds)));
  } catch (err) {
    return handleError('reasons', err);
  }
}
