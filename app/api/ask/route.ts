import { NextResponse } from 'next/server';
import { AskRequestSchema, AskResponseSchema } from '@/lib/schemas';
import { answerQuestion } from '@/lib/server/ask';
import { handleError, readJson } from '@/lib/server/http';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = AskRequestSchema.parse(await readJson(req));
    return NextResponse.json(AskResponseSchema.parse(await answerQuestion(body)));
  } catch (err) {
    return handleError('ask', err);
  }
}
