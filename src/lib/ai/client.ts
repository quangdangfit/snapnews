import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-sonnet-4-6';
export const MAX_TOKENS_SUMMARY = 4096;
export const MAX_TOKENS_CLUSTER = 4096;

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _client = new Anthropic({ maxRetries: 3 });
  }
  return _client;
}

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
