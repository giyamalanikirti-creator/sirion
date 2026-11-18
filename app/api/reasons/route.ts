import { NextResponse } from 'next/server';
import { ReasonsRequestSchema, ReasonsResponseSchema } from '@/lib/schemas';
import { handleError, readJson } from '@/lib/server/http';
import { getContract, redlines } from '@/lib/data';
import { writeReasons } from '@/lib/server/reasons';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { wordingOptionIds, redlineId } = ReasonsRequestSchema.parse(await readJson(req));
    const r = redlines.find((x) => x.id === redlineId);
    const supplier = r ? `${r.supplier} (${getContract(r.contractId).supplierType})` : undefined;
    return NextResponse.json(ReasonsResponseSchema.parse(await writeReasons(wordingOptionIds, supplier)));
  } catch (err) {
    return handleError('reasons', err);
  }
}
