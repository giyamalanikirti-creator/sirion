import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

export const AI_TIMEOUT_MS = 20_000;

export const MODEL_FAST = process.env.MODEL_FAST || 'claude-haiku-5-5';
export const MODEL_SMART = process.env.MODEL_SMART || 'claude-sonnet-5-5';

/** Live only when a key is set and DEMO_MODE is not "cached". */
export function isLive(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.DEMO_MODE !== 'cached';
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!client) client = new Anthropic({ timeout: AI_TIMEOUT_MS, maxRetries: 0 });
  return client;
}

/** Hard wall-clock cap for a whole AI operation (agent loops make several calls). */
export async function withTimeout<T>(p: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`AI call timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

export function logAiFailure(route: string, err: unknown) {
  if (err instanceof Anthropic.APIError) {
    console.warn(`[${route}] Anthropic API error ${err.status}: ${err.message}. Using cached fixture.`);
  } else {
    console.warn(`[${route}] ${(err as Error)?.message ?? err}. Using cached fixture.`);
  }
}
