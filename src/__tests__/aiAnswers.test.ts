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

describe('stages and facts', () => {
  it('labels recommendation, deltas and fact status', async () => {
    const { delta } = await import('../pages/Feedback/AIAnswers');
    const { factStatus, factText } = await import('../pages/Feedback/BusinessFacts');
    expect(answerLabel({ ...base, mentioned: true, recommended: true })).toBe('Recommended, not linked');
    expect(delta(0.5, 0.25)).toBe(' (+25 pts)');
    expect(delta(0.5, null)).toBe('');
    expect(factStatus({ value: 'Acme', source: 'customer', verified: true })).toBe('verified (confirmed by you)');
    expect(factStatus({ value: 'Big claim', source: 'inferred', verified: false })).toBe('not verified (inferred)');
    expect(factStatus({ items: [] })).toBe('not stated on the site');
    expect(factText({ items: [
      { value: 'a', source: 'crawl', verified: true, evidence: [] },
      { value: 'b', source: 'inferred', verified: false, evidence: [] }] })).toBe('a\nb');
  });
});
