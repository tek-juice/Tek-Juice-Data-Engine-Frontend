import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentReviews, { describeReason } from '../pages/ContentReviews/ContentReviews';
import * as reviews from '../api/contentReview';
import * as auth from '../services/auth.service';
import * as context from '../contexts/IntelligenceRunContext';

const HELD = {
  execution_id: 'e1', action_type: 'create', target_url: null, title: 'Moving costs',
  approval_status: 'held', publication_status: 'pending', updated_at: null,
  approval: { decision: 'held', reasons: ['unverified_figures:$19.99, 30%'] },
};

beforeEach(() => {
  vi.spyOn(context, 'useIntelligenceRun').mockReturnValue({
    website: { id: 'site-1', domain: 'shop.example' },
  } as never);
  vi.spyOn(reviews, 'listContentReviews').mockResolvedValue([HELD]);
  vi.spyOn(reviews, 'getApprovalPolicy').mockResolvedValue({
    website_id: 'site-1', mode: 'auto', hold_unverified_figures: true,
  });
});

describe('ContentReviews', () => {
  it('explains why content was held and records an approval with a note', async () => {
    vi.spyOn(auth, 'isAdmin').mockReturnValue(true);
    const review = vi.spyOn(reviews, 'reviewContent').mockResolvedValue({
      execution_id: 'e1', approval_status: 'approved',
    });
    render(<ContentReviews />);

    expect(await screen.findByText('Figures not found on your website: $19.99, 30%')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/review note/i), 'Prices confirmed');
    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(review).toHaveBeenCalledWith('site-1', 'e1', 'approve', 'Prices confirmed'));
    expect(await screen.findByText(/no content is waiting/i)).toBeInTheDocument();
  });

  it('shows reasons but no decisions to non-admins', async () => {
    vi.spyOn(auth, 'isAdmin').mockReturnValue(false);
    render(<ContentReviews />);

    expect(await screen.findByText('Moving costs')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/approval mode/i)).toBeDisabled();
  });

  it('describes policy reasons in plain language', () => {
    expect(describeReason('manual_review_required')).toMatch(/manual review/i);
    expect(describeReason('enrichment_invalid:seo_title_tag_invalid')).toMatch(/Enrichment problems/);
  });
});
