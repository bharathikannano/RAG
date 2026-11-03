/**
 * LLM Fallback Chain
 * ==================
 * Reads LLM_FALLBACK_ORDER from .env, skips providers with no key,
 * falls through on 429 / 5xx / timeout, emitting SSE events.
 *
 * "extractive" is always the final fallback.
 */

import { createOpenAICompatibleProvider } from './openaiProvider.js';
import { extractiveProvider } from './extractiveProvider.js';
import { isRetryable } from './interface.js';

const HOSTED_PROVIDERS = ['groq', 'gemini', 'openrouter', 'cerebras'];

function buildProviderList() {
  const order = (process.env.LLM_FALLBACK_ORDER || 'groq,gemini,openrouter,cerebras,extractive')
    .split(',')
    .map(s => s.trim().toLowerCase());

  return order.map(name => {
    if (name === 'extractive') return extractiveProvider;
    if (HOSTED_PROVIDERS.includes(name)) return createOpenAICompatibleProvider(name);
    return null;
  }).filter(Boolean);
}

/**
 * Run the fallback chain, yielding SSE-ready objects.
 * Caller is responsible for writing them to the response stream.
 *
 * @param {object} opts
 * @param {string} opts.preferredProvider - 'auto' | specific provider name
 * @param {object} opts.llmPayload - { messages } for hosted, extra fields for extractive
 * @param {AbortSignal} opts.signal
 */
export async function* runFallbackChain({ preferredProvider, llmPayload, signal }) {
  const all = buildProviderList();

  // Filter to preferred if not 'auto'
  let chain = preferredProvider === 'auto'
    ? all
    : all.filter(p => p.name === preferredProvider || p.name === 'extractive');

  // Skip unavailable hosted providers
  chain = chain.filter(p => p.name === 'extractive' || p.available);

  if (chain.length === 0) {
    chain = [extractiveProvider];
  }

  let prevProviderName = null;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];

    if (prevProviderName) {
      // Announce the fallback transition
      yield {
        stage: 'provider_fallback',
        payload: {
          from: prevProviderName,
          to: provider.name,
          reason: 'rate_limit_or_error',
          retry_after: null,
        },
      };
    }

    // Announce which provider is being tried
    yield {
      stage: 'provider_start',
      payload: {
        provider: provider.name,
        model: provider.model || null,
        isExtractive: provider.name === 'extractive',
      },
    };

    try {
      const payload = provider.name === 'extractive'
        ? llmPayload.extractivePayload
        : { messages: llmPayload.messages, signal };

      for await (const event of provider.streamAnswer(payload)) {
        yield { stage: 'llm', payload: event };
      }

      // Success — we're done
      yield { stage: 'provider_done', payload: { provider: provider.name } };
      return;
    } catch (err) {
      prevProviderName = provider.name;

      if (isRetryable(err)) {
        yield {
          stage: 'provider_error',
          payload: {
            provider: provider.name,
            statusCode: err.statusCode,
            retryAfter: err.retryAfter,
            message: err.message,
          },
        };
        // Continue to next provider
      } else {
        // Non-retryable — surface the error and try next
        yield {
          stage: 'provider_error',
          payload: {
            provider: provider.name,
            statusCode: err.statusCode ?? 0,
            message: err.message,
          },
        };
      }
    }
  }

  // All providers exhausted — shouldn't happen because extractive is always last
  yield {
    stage: 'error',
    payload: { message: 'All providers exhausted. Please try again.' },
  };
}
