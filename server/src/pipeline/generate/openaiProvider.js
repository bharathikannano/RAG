/**
 * OpenAI-compatible streaming provider factory.
 * Uses the "openai" npm package pointed at different base URLs.
 *
 * Supports: groq, gemini, openrouter, cerebras
 */
import OpenAI from 'openai';
import { ProviderError } from './interface.js';

const CONFIGS = {
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
  },
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
  },
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    modelEnv: 'OPENROUTER_MODEL',
  },
  cerebras: {
    baseURL: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    modelEnv: 'CEREBRAS_MODEL',
  },
};

// Cache one client per provider
const clients = new Map();

function getClient(providerName) {
  if (clients.has(providerName)) return clients.get(providerName);
  const cfg = CONFIGS[providerName];
  const apiKey = process.env[cfg.apiKeyEnv];
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: cfg.baseURL,
    defaultHeaders:
      providerName === 'openrouter'
        ? { 'HTTP-Referer': 'https://github.com/profilerag', 'X-Title': 'profileRAG' }
        : undefined,
  });
  clients.set(providerName, client);
  return client;
}

/**
 * Create a streamAnswer generator for an OpenAI-compatible provider.
 * @param {string} providerName
 * @returns {{ name, available, streamAnswer }}
 */
export function createOpenAICompatibleProvider(providerName) {
  const cfg = CONFIGS[providerName];

  return {
    name: providerName,
    get available() {
      return Boolean(process.env[cfg.apiKeyEnv]);
    },
    get model() {
      return process.env[cfg.modelEnv] || '(not set)';
    },

    async *streamAnswer({ messages, signal }) {
      const client = getClient(providerName);
      if (!client) throw new ProviderError(`No API key for ${providerName}`, { statusCode: 401 });

      const model = process.env[cfg.modelEnv];
      if (!model) throw new ProviderError(`No model set for ${providerName}`, { statusCode: 500 });

      let stream;
      try {
        stream = await client.chat.completions.create(
          {
            model,
            messages,
            stream: true,
            max_tokens: 500,
            temperature: 0.2,
          },
          { signal }
        );
      } catch (err) {
        const status = err?.status ?? err?.statusCode ?? 0;
        const retryAfter = err?.headers?.['retry-after']
          ? parseInt(err.headers['retry-after'], 10)
          : undefined;
        throw new ProviderError(err.message, { statusCode: status, retryAfter });
      }

      let promptTokens = 0, completionTokens = 0;

      for await (const chunk of stream) {
        if (signal?.aborted) break;
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) yield { type: 'token', text: delta };
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens ?? 0;
          completionTokens = chunk.usage.completion_tokens ?? 0;
        }
      }

      yield { type: 'usage', prompt_tokens: promptTokens, completion_tokens: completionTokens };
    },
  };
}
