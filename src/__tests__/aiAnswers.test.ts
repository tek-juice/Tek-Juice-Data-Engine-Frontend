import { describe, expect, it } from 'vitest';
import { answerLabel, platformName } from '../pages/Feedback/AIAnswers';
import type { AIAnswerRecord } from '../api/dashboard';

const base: AIAnswerRecord = {
  platform: 'gemini', model: null, query_text: 'q', query_kind: 'query', grounded: true,
  mentioned: false, cited: false, cited_url: null, cited_rank: null, sources: [],
  answer_excerpt: null, error: null, measured_at: null,
};

describe('answerLabel', () => {
  it('describes each answer', () => {
    expect(answerLabel({ ...base, cited: true, cited_rank: 2 })).toBe('Cited (source #2)');
    expect(answerLabel({ ...base, mentioned: true })).toBe('Mentioned, not linked');
    expect(answerLabel({ ...base, grounded: false })).toBe('Answered from memory (no web search)');
    expect(answerLabel({ ...base, sources: [{ url: 'u', domain: 'which.co.uk', title: '' }] }))
      .toBe('Not cited; used which.co.uk');
    expect(answerLabel({ ...base, error: 'http_429', cited: null })).toBe('Not measured (http_429)');
    expect(platformName('chatgpt')).toBe('ChatGPT');
  });
});
