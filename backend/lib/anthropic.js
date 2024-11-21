import Anthropic from '@anthropic-ai/sdk';

if (!process.env.CLAUDE_API_KEY) {
  throw new Error('CLAUDE_API_KEY is required');
}

export const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});
