import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WebsiteSetup from '../pages/WebsiteSetup/WebsiteSetup';
import * as websites from '../api/websites';
import * as dashboard from '../api/dashboard';
import * as connector from '../api/connector';
import * as auth from '../services/auth.service';

const WEBSITE_ID = 'site-1';
const SECRET_KEY = 'tjck_live_super_secret_connector_key_value';

function mockState(onboarding: string, publication: Record<string, unknown> | null = null) {
  vi.spyOn(websites, 'getWebsiteStatus').mockResolvedValue({
    website_id: WEBSITE_ID, url: 'https://shop.example', domain: 'shop.example', status: 'active',
    onboarding_status: onboarding, stage: null, run_status: null, progress: null, page_count: 0,
    last_crawled_at: null, verified_at: null,
  });
  vi.spyOn(dashboard, 'getVisibilityConnection').mockResolvedValue({
    website_id: WEBSITE_ID, product_name: null, website_url: 'https://shop.example',
    domain: 'shop.example', status: 'active', verified_at: null, last_crawled_at: null,
    page_count: 0, meta: null, onboarding_status: onboarding,
    publication: publication ? {
      transport: 's2s_connector', status: 'not_configured', ready: false, endpoint_host: null,
      capabilities: [], contract_versions: [], verified_at: null, failure_reason: null,
      ...publication,
    } : undefined,
  });
}

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={[`/websites/${WEBSITE_ID}/setup`]}>
      <Routes>
        <Route path="/websites/:websiteId/setup" element={<WebsiteSetup />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(auth, 'isAdmin').mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WebsiteSetup', () => {
  it('shows a new connector key once and never stores it in the browser', async () => {
    mockState('WEBSITE_REGISTERED');
    vi.spyOn(connector, 'issueConnectorCredential').mockResolvedValue({
      credential_id: 'c1', website_id: WEBSITE_ID, key: SECRET_KEY, key_prefix: 'tjck_liv',
      name: 'Connector', status: 'active', message: '',
    });
    renderSetup();

    await userEvent.click(await screen.findByRole('button', { name: /generate connector key/i }));

    expect(await screen.findByText(new RegExp(`TEKJUICE_CONNECTOR_KEY=${SECRET_KEY}`))).toBeInTheDocument();
    const stored = [
      ...Object.keys(localStorage).map(k => localStorage.getItem(k)),
      ...Object.keys(sessionStorage).map(k => sessionStorage.getItem(k)),
      document.cookie, window.location.href,
    ].join('|');
    expect(stored).not.toContain(SECRET_KEY);

    await userEvent.click(screen.getByRole('button', { name: /i have saved the key/i }));
    expect(screen.queryByText(new RegExp(SECRET_KEY))).not.toBeInTheDocument();
  });

  it('offers to replace an existing key when one is already active', async () => {
    mockState('WEBSITE_REGISTERED');
    vi.spyOn(connector, 'issueConnectorCredential').mockRejectedValue({
      response: { status: 409, data: { error: { message: 'An active connector credential already exists' } } },
    });
    renderSetup();

    await userEvent.click(await screen.findByRole('button', { name: /generate connector key/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    await userEvent.click(screen.getByRole('button', { name: /lost the key\? replace it/i }));
    expect(screen.getByRole('button', { name: /replace key/i })).toBeInTheDocument();
  });

  it('walks through ownership verification and reports failures', async () => {
    mockState('CONNECTOR_PENDING');
    vi.spyOn(connector, 'createOwnershipChallenge').mockResolvedValue({
      challenge_id: 'ch1', website_id: WEBSITE_ID, domain: 'shop.example', method: 'https_file',
      instructions: { url: 'https://shop.example/.well-known/tekjuice-verification.txt', file_contents: 'tok-123' },
      expires_at: new Date(Date.now() + 1800_000).toISOString(),
    });
    const verify = vi.spyOn(connector, 'verifyOwnershipChallenge').mockRejectedValueOnce({
      response: { status: 409, data: { error: { message: 'Ownership proof was not found' } } },
    });
    renderSetup();

    await userEvent.click(await screen.findByLabelText(/https file/i));
    await userEvent.click(screen.getByRole('button', { name: /get verification instructions/i }));
    expect(await screen.findByText('tok-123')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /verify ownership/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ownership proof was not found');
    expect(verify).toHaveBeenCalledWith(WEBSITE_ID, 'ch1');
  });

  it('polls while verifying and shows readiness from the backend', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockState('BACKEND_CONNECTED', { status: 'pending_verification' });
    renderSetup();
    expect(await screen.findByText('Verifying publication')).toBeInTheDocument();

    mockState('READY', {
      status: 'verified', ready: true, endpoint_host: 'api.shop.example',
      capabilities: ['publish.create', 'publish.verify'], verified_at: new Date().toISOString(),
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(await screen.findByText('Publication ready')).toBeInTheDocument();
    expect(screen.getByTestId('publication-details')).toHaveTextContent('api.shop.example');
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/visibility');
  });

  it('explains a failed verification and lets an admin retry it', async () => {
    mockState('BACKEND_CONNECTED', { status: 'failed', failure_reason: 'receiver_authentication_failed' });
    const reverify = vi.spyOn(connector, 'reverifyPublication').mockResolvedValue({} as never);
    renderSetup();

    expect(await screen.findByText(/TEKJUICE_RECEIVER_SECRET/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /verify again/i }));
    await waitFor(() => expect(reverify).toHaveBeenCalledWith(WEBSITE_ID));
  });

  it('gives non-admins status but no actions', async () => {
    vi.spyOn(auth, 'isAdmin').mockReturnValue(false);
    mockState('BACKEND_CONNECTED', { status: 'failed', failure_reason: 'endpoint_unreachable' });
    renderSetup();

    expect(await screen.findByText(/administrator must complete/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /verify again/i })).not.toBeInTheDocument();
  });

  it('shows a not-found error for another tenant\'s website', async () => {
    vi.spyOn(websites, 'getWebsiteStatus').mockRejectedValue({ response: { status: 404 } });
    vi.spyOn(dashboard, 'getVisibilityConnection').mockRejectedValue({ response: { status: 404 } });
    renderSetup();

    expect(await screen.findByRole('alert')).toHaveTextContent('not found for your account');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
