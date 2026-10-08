import { afterEach, expect, it, vi } from 'vitest';
import { openAiCaller } from '@/lib/answer-service';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it.each(['gpt-4.1-mini', 'gpt-4.1-mini-2025-04-14', 'gpt-6-luna'])('sends compatible controls for %s', async (model) => {
  vi.stubEnv('OPENAI_API_KEY', 'test-key');
  vi.stubEnv('OPENAI_MODEL', model);
  vi.stubEnv('OPENAI_REASONING_EFFORT', 'low');
  vi.stubEnv('OPENAI_VERBOSITY', 'low');
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ output_text: '{"kind":"chat"}' })));
  vi.stubGlobal('fetch', fetcher);
  await openAiCaller({ system: 'Test', turns: [], question: 'Hello', signal: new AbortController().signal });
  const options = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1];
  const body = JSON.parse(options.body as string);
  expect(body.text.format.type).toBe('json_schema');
  expect(body.text.format.strict).toBe(true);
  if (model.startsWith('gpt-4.1')) {
    expect(body).not.toHaveProperty('reasoning');
    expect(body.text).not.toHaveProperty('verbosity');
  } else {
    expect(body.reasoning).toEqual({ effort: 'low' });
    expect(body.text.verbosity).toBe('low');
  }
});
