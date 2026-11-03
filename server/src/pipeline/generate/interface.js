/**
 * LLM Provider Interface
 * ======================
 * All providers implement:
 *   streamAnswer({ messages, signal }) -> AsyncGenerator<token|event>
 *
 * Each yielded item is one of:
 *   { type: 'token', text: string }
 *   { type: 'usage', prompt_tokens, completion_tokens }
 *   { type: 'error', message: string }
 */

export class ProviderError extends Error {
  constructor(message, { statusCode, retryAfter } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

export function isRetryable(err) {
  return (
    err instanceof ProviderError &&
    (err.statusCode === 429 || err.statusCode >= 500)
  );
}
