import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentReviews, { describeReason } from '../pages/ContentReviews/ContentReviews';
import ArticlePreview from '../components/content/ArticlePreview';
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

  const UPDATE = { ...HELD, execution_id: 'e2', action_type: 'update', title: 'Budget guide',
    target_url: 'https://shop.example/budget-guide', approval: { decision: 'held', reasons: ['manual_review_required'] } };
  const DETAIL = {
    ...UPDATE, content: 'Intro with a [source](https://docs.example/a) link.\n\n## Planning a budget\n\nSee https://shop.example/tips for more.',
    meta_description: 'A practical guide to planning a monthly budget that you will actually keep.',
    slug: 'budget-guide', primary_query: 'budget guide', style_warnings: [], review_edits: [], edited: false,
  };

  it('links the existing page and opens the article with clickable links', async () => {
    vi.spyOn(auth, 'isAdmin').mockReturnValue(false);
    vi.spyOn(reviews, 'listContentReviews').mockResolvedValue([UPDATE]);
    vi.spyOn(reviews, 'getContentReview').mockResolvedValue(DETAIL);
    render(<ContentReviews />);

    const existing = await screen.findByRole('link', { name: /existing page/i });
    expect(existing).toHaveAttribute('href', 'https://shop.example/budget-guide');
    expect(existing).toHaveAttribute('target', '_blank');
    await userEvent.click(screen.getByRole('button', { name: /read article/i }));

    const source = await screen.findByRole('link', { name: 'source' });
    expect(source).toHaveAttribute('href', 'https://docs.example/a');
    expect(source).toHaveAttribute('target', '_blank');
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'https://shop.example/tips' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('heading', { name: 'Planning a budget' })).toBeInTheDocument();
  });

  it('saves only the changed fields, then approves with the final edits', async () => {
    vi.spyOn(auth, 'isAdmin').mockReturnValue(true);
    vi.spyOn(reviews, 'listContentReviews').mockResolvedValue([UPDATE]);
    vi.spyOn(reviews, 'getContentReview').mockResolvedValue(DETAIL);
    const save = vi.spyOn(reviews, 'saveContentEdits').mockResolvedValue({ ...DETAIL, title: 'Budget guide, revised', edited: true });
    const review = vi.spyOn(reviews, 'reviewContent').mockResolvedValue({ execution_id: 'e2', approval_status: 'approved' });
    render(<ContentReviews />);

    await userEvent.click(await screen.findByRole('button', { name: /^edit$/i }));
    const headline = await screen.findByLabelText('Headline');
    await userEvent.clear(headline);
    await userEvent.type(headline, 'Budget guide, revised');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('site-1', 'e2', { title: 'Budget guide, revised' }));
    expect(await screen.findByText(/still waiting for approval/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Article body'), ' Extra line.');
    await userEvent.click(screen.getByRole('button', { name: /save & approve/i }));
    await waitFor(() => expect(review).toHaveBeenCalledWith(
      'site-1', 'e2', 'approve', '', { content: `${DETAIL.content} Extra line.` }));
    expect(await screen.findByText(/no content is waiting/i)).toBeInTheDocument();
  });
});

describe('ArticlePreview', () => {
  it('shows subheadings as headings, not body text', () => {
    render(<ArticlePreview title="Title" content={'Intro paragraph.\n\n## First section\n\nBody.\n\n### Detail\n\n* one\n* two'} />);
    expect(screen.getByRole('heading', { level: 2, name: 'First section' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Detail' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('never turns a javascript: address into a link', () => {
    render(<ArticlePreview content={'Click [here](javascript:alert(1)) now.'} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
