import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import EntryGate from '../routes/EntryGate';
import SessionWatcher from '../components/SessionWatcher';
import PublicationStatusBanner from '../components/connection/PublicationStatusBanner';
import WebsiteSwitcher from '../components/connection/WebsiteSwitcher';
import { IntelligenceRunProvider, useIntelligenceRun } from '../contexts/IntelligenceRunContext';
import * as websitesApi from '../api/websites';
import * as intelligenceApi from '../api/intelligence';
import * as dashboard from '../api/dashboard';
import { setSessionUser } from '../services/session';

const site = (id: string, onboarding: string) => ({
  id, url: `https://${id}.example`, domain: `${id}.example`, status: 'active',
  onboarding_status: onboarding, page_count: 0, last_crawled_at: null, created_at: '',
});

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderWithProvider(ui: React.ReactNode, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <IntelligenceRunProvider>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="*" element={<Where />} />
        </Routes>
      </IntelligenceRunProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setSessionUser({ sub: 'user-1', tenant_id: 't1', role: 'admin' });
  vi.spyOn(intelligenceApi, 'getIntelligenceRuns').mockResolvedValue([]);
});

describe('EntryGate', () => {
  it('sends a new customer to website registration', async () => {
    vi.spyOn(websitesApi, 'listWebsites').mockResolvedValue([]);
    renderWithProvider(<EntryGate />);
    expect(await screen.findByTestId('where')).toHaveTextContent('/websites/connect');
  });

  it('opens the dashboard even while the website is still connecting (the banner explains)', async () => {
    vi.spyOn(websitesApi, 'listWebsites').mockResolvedValue([site('a', 'CONNECTOR_PENDING')]);
    renderWithProvider(<EntryGate />);
    expect(await screen.findByTestId('where')).toHaveTextContent('/visibility');
  });

  it('sends an existing READY customer to the dashboard', async () => {
    vi.spyOn(websitesApi, 'listWebsites').mockResolvedValue([site('a', 'READY')]);
    renderWithProvider(<EntryGate />);
    expect(await screen.findByTestId('where')).toHaveTextContent('/visibility');
  });

  it('shows a retry instead of a dead end when loading fails', async () => {
    const list = vi.spyOn(websitesApi, 'listWebsites')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue([site('a', 'READY')]);
    renderWithProvider(<EntryGate />);

    await userEvent.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/visibility');
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe('website selection and isolation', () => {
  function Probe() {
    const { website } = useIntelligenceRun();
    return <div data-testid="selected">{website?.id ?? 'none'}</div>;
  }

  it('switches every website-scoped query to the selected website and remembers it', async () => {
    vi.spyOn(websitesApi, 'listWebsites').mockResolvedValue([site('a', 'READY'), site('b', 'READY')]);
    const runs = vi.spyOn(intelligenceApi, 'getIntelligenceRuns').mockResolvedValue([]);
    const connection = vi.spyOn(dashboard, 'getVisibilityConnection').mockResolvedValue({
      website_id: 'x', product_name: null, website_url: '', domain: '', status: 'active',
      verified_at: null, last_crawled_at: null, page_count: 0, meta: null,
    });
    renderWithProvider(<><WebsiteSwitcher /><PublicationStatusBanner /><Probe /></>);

    expect(await screen.findByTestId('selected')).toHaveTextContent('a');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'b');

    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('b'));
    expect(runs).toHaveBeenLastCalledWith('b');
    await waitFor(() => expect(connection).toHaveBeenLastCalledWith('b'));
    expect(Object.values(localStorage).some(value => value.includes('"b"'))).toBe(true);
  });
});

describe('PublicationStatusBanner', () => {
  it('explains a READY website without a verified receiver and links to its setup', async () => {
    vi.spyOn(websitesApi, 'listWebsites').mockResolvedValue([site('a', 'READY')]);
    vi.spyOn(dashboard, 'getVisibilityConnection').mockResolvedValue({
      website_id: 'a', product_name: null, website_url: '', domain: '', status: 'active',
      verified_at: null, last_crawled_at: null, page_count: 0, meta: null,
      onboarding_status: 'READY',
      publication: {
        transport: 's2s_connector', status: 'not_configured', ready: false, endpoint_host: null,
        capabilities: [], contract_versions: [], verified_at: null, failure_reason: null,
      },
    });
    renderWithProvider(<PublicationStatusBanner />);

    const banner = await screen.findByTestId('publication-banner');
    expect(banner).toHaveTextContent('Publication not connected');
    expect(screen.getByRole('link', { name: /open connection setup/i }))
      .toHaveAttribute('href', '/websites/a/setup');
  });

  it('is hidden when publication is verified', async () => {
    vi.spyOn(websitesApi, 'listWebsites').mockResolvedValue([site('a', 'READY')]);
    const connection = vi.spyOn(dashboard, 'getVisibilityConnection').mockResolvedValue({
      website_id: 'a', product_name: null, website_url: '', domain: '', status: 'active',
      verified_at: null, last_crawled_at: null, page_count: 0, meta: null,
      onboarding_status: 'READY',
      publication: {
        transport: 's2s_connector', status: 'verified', ready: true, endpoint_host: 'api.a.example',
        capabilities: [], contract_versions: ['1.0'], verified_at: '', failure_reason: null,
      },
    });
    renderWithProvider(<PublicationStatusBanner />);

    await waitFor(() => expect(connection).toHaveBeenCalled());
    expect(screen.queryByTestId('publication-banner')).not.toBeInTheDocument();
  });
});

describe('expired session', () => {
  it('returns the user to login with an explanation', async () => {
    render(
      <MemoryRouter initialEntries={['/visibility']}>
        <SessionWatcher />
        <Routes>
          <Route path="/visibility" element={<div>dashboard</div>} />
          <Route path="/login" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'session_expired' } }));
    });

    expect(await screen.findByTestId('where')).toHaveTextContent('/login');
  });
});
