import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import Competitors from '../pages/Competitors/Competitors';
import Gaps from '../pages/Gaps/Gaps';
import * as intelligence from '../api/intelligence';
import * as websites from '../api/websites';
import * as context from '../contexts/IntelligenceRunContext';

// The account has two websites; the user picked the second in the switcher.
const FIRST = { id: 'site-1', domain: 'first.example' };
const CHOSEN = { id: 'site-2', domain: 'second.example' };

let run: { mockReturnValue: (value: never) => unknown };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(websites, 'listWebsites').mockResolvedValue([FIRST, CHOSEN] as never);
  run = vi.spyOn(context, 'useIntelligenceRun').mockReturnValue({
    website: CHOSEN, selectedRunId: 'run-of-site-2',
  } as never);
});

describe('pages follow the website chosen in the switcher', () => {
  it('Competitors loads the chosen website with its own run', async () => {
    const load = vi.spyOn(intelligence, 'getCompetitors').mockResolvedValue([] as never);
    render(<Competitors />);
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(load).toHaveBeenLastCalledWith('site-2', 'run-of-site-2');
    expect(websites.listWebsites).not.toHaveBeenCalled();
  });

  it('Gaps loads the chosen website, not the first one', async () => {
    const load = vi.spyOn(intelligence, 'getIntelligenceGaps').mockResolvedValue([] as never);
    render(<Gaps />);
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(load.mock.lastCall?.[0]).toBe('site-2');
  });

  it('falls back to the account websites before one is chosen', async () => {
    run.mockReturnValue({ website: null, selectedRunId: null } as never);
    const load = vi.spyOn(intelligence, 'getCompetitors').mockResolvedValue([] as never);
    render(<Competitors />);
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(load.mock.lastCall?.[0]).toBe('site-1');
  });
});
