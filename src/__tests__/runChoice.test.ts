import { describe, expect, it } from 'vitest';
import { chooseRun } from '../contexts/IntelligenceRunContext';
import type { IntelligenceRun } from '../api/intelligence';

const run = (id: string, status = 'completed') =>
  ({ id, status, website_id: 'w', stage: null, progress: null, error: null,
     started_at: null, completed_at: null }) as IntelligenceRun;

describe('chooseRun', () => {
  const runs = [run('new'), run('mid'), run('old')]; // newest first

  it('shows the newest completed run by default', () => {
    expect(chooseRun(runs, null)).toBe('new');
    expect(chooseRun([run('running', 'running'), ...runs], null)).toBe('new');
  });

  it('keeps an explicit choice while no newer run has completed', () => {
    expect(chooseRun(runs, { id: 'old', newestAtChoice: 'new' })).toBe('old');
  });

  it('moves to the newest run once a newer run completes', () => {
    expect(chooseRun([run('newer'), ...runs], { id: 'old', newestAtChoice: 'new' })).toBe('newer');
  });

  it('ignores a choice for a run that no longer exists', () => {
    expect(chooseRun(runs, { id: 'gone', newestAtChoice: 'new' })).toBe('new');
  });
});
