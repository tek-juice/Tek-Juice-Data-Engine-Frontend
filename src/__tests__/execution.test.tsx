import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Execution from '../pages/Execution/Execution';
import * as dashboard from '../api/dashboard';
import * as context from '../contexts/IntelligenceRunContext';

const PUBLISHED = {
  id: 'e1', action_type: 'create', target_title: 'Household budget', approval_status: 'approved',
  publication_status: 'published', published_url: 'https://shop.example/household-budget',
} as unknown as dashboard.ContentExecution;

beforeEach(() => {
  vi.spyOn(context, 'useIntelligenceRun').mockReturnValue({
    website: { id: 'site-1', domain: 'shop.example' }, selectedRunId: 'run-latest',
  } as never);
});

describe('Execution', () => {
  it('shows every execution of the website, not only the latest run', async () => {
    const list = vi.spyOn(dashboard, 'getContentExecutions').mockResolvedValue({
      items: [PUBLISHED], total: 1, page: 1, page_size: 100,
    } as never);
    render(<Execution />);
    await waitFor(() => expect(screen.getByText('Household budget')).toBeTruthy());
    expect(list).toHaveBeenLastCalledWith(expect.not.objectContaining({ run_id: expect.anything() }));
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ website_id: 'site-1' }));

    await userEvent.selectOptions(screen.getByLabelText('Which executions'), 'run');
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ run_id: 'run-latest' })));
  });
});
