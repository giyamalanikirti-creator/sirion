import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function handleError(route: string, err: unknown) {
  if (err instanceof ZodError) return badRequest(err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  console.error(`[${route}]`, err);
  return NextResponse.json({ error: (err as Error)?.message ?? 'Something went wrong' }, { status: 400 });
}
