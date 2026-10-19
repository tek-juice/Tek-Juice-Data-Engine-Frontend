import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ProductProfile } from '../api/intelligence';
import * as intelligence from '../api/intelligence';
import * as websites from '../api/websites';
import { MarketIntelligence, OfferingsList } from '../pages/ProductIntelligence/MarketIntelligence';
import { marketSections, offeringDisplay, scopeSummary } from '../pages/ProductIntelligence/marketLabels';
// Produced by the backend engine (services.intelligence offerings + geo_scope)
// from synthetic pages, so the test follows the real API contract.
import fixtures from './fixtures/productGeography.json';

const umet = fixtures.umet as unknown as ProductProfile;
const mixed = fixtures.mixed as unknown as ProductProfile;
const empty = fixtures.empty as unknown as ProductProfile;

describe('product and market labels', () => {
  it('never presents an undetermined scope as a market', () => {
    expect(scopeSummary(umet.geography!)).toMatch(/^Not determined/);
    expect(scopeSummary(umet.geography!)).not.toMatch(/Worldwide|National|United Kingdom/);
  });

  it('keeps weak signals, demand and visibility apart from confirmed markets', () => {
    const sections = Object.fromEntries(marketSections(umet.geography!).map((s) => [s.key, s.markets.map((m) => m.name)]));
    expect(sections.operational_markets).toBeUndefined();
    expect(sections.unverified_markets).toEqual(['United Kingdom']);
    expect(sections.observed_demand_markets).toEqual(['Uganda']);
  });

  it('maps offerings with status and falls back for profiles without provenance', () => {
    const display = offeringDisplay(umet);
    expect(display.state).toBe('identified');
    const byName = Object.fromEntries(display.offerings.map((o) => [o.name, o.status]));
    expect(byName['Expense tracking']).toBe('confirmed');
    expect(byName['Relocation planning']).toBe('unverified');
    expect(offeringDisplay({ ...umet, offerings: null, products: [], services: ['Audits'] }).state).toBe('legacy');
    expect(offeringDisplay(empty).state).toBe('unresolved');
  });
});

describe('MarketIntelligence and OfferingsList', () => {
  it('shows confirmed offerings and lists unverified ones separately', () => {
    render(<OfferingsList product={umet} />);
    const list = screen.getByRole('list', { name: 'Identified offerings' });
    expect(list.textContent).toContain('Expense tracking');
    expect(list.textContent).toContain('Confirmed');
    expect(list.textContent).not.toContain('Relocation planning');
    expect(screen.getByText(/unverified, not used/).textContent).toContain('Relocation planning');
  });

  it('explains why nothing was identified', () => {
    render(<OfferingsList product={empty} />);
    expect(screen.getByText('Not identified from the website.')).toBeTruthy();
    expect(screen.getByText(/No customer pages were available/)).toBeTruthy();
  });

  it('shows an undetermined scope with the missing evidence and weak signals', () => {
    render(<MarketIntelligence product={umet} />);
    expect(screen.getAllByText('Not determined').length).toBeGreaterThan(0);
    expect(screen.getByText(/No supported-country list/)).toBeTruthy();
    expect(screen.getByText('Unverified signals')).toBeTruthy();
    expect(screen.getByText('Observed demand')).toBeTruthy();
    expect(screen.queryByText('Confirmed operational markets')).toBeNull();
  });

  it('shows per-offering scopes, headquarters and exclusions for a mixed site', () => {
    render(<MarketIntelligence product={mixed} />);
    expect(screen.getByText('Mixed (differs by offering)')).toBeTruthy();
    expect(screen.getByText(/Online bookkeeping: Worldwide/)).toBeTruthy();
    expect(screen.getByText(/Payroll consulting: City \(London\)/)).toBeTruthy();
    expect(screen.getByText('Headquarters')).toBeTruthy();
    expect(screen.getByText('Not available in')).toBeTruthy();
    expect(screen.getByText('Nigeria')).toBeTruthy();
  });

  it('says when a profile predates geographic intelligence instead of claiming no markets', () => {
    render(<MarketIntelligence product={{ ...umet, geography: null, locations: [] }} />);
    expect(screen.getByText(/was not computed for this run/)).toBeTruthy();
  });
});

describe('ProductIntelligence page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the run-scoped summary from the API', async () => {
    vi.spyOn(websites, 'listWebsites').mockResolvedValue([
      { id: 'w1', url: 'https://ultimatemove.co.uk', domain: 'ultimatemove.co.uk' } as never,
    ]);
    vi.spyOn(intelligence, 'getIntelligenceRuns').mockResolvedValue([]);
    const summary = vi.spyOn(intelligence, 'getIntelligenceSummary').mockResolvedValue({
      website_id: 'w1', product: umet, queries_discovered: 1, competitors_found: 0, gaps_found: 0, opportunities: 0,
    });
    const { default: ProductIntelligence } = await import('../pages/ProductIntelligence/ProductIntelligence');
    const { IntelligenceRunProvider } = await import('../contexts/IntelligenceRunContext');
    render(
      <MemoryRouter>
        <IntelligenceRunProvider>
          <ProductIntelligence />
        </IntelligenceRunProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Expense tracking')).toBeTruthy());
    expect(summary).toHaveBeenCalled();
    expect(screen.getByText('Locations and markets')).toBeTruthy();
    expect(screen.queryByText('No services identified yet.')).toBeNull();
  });
});
