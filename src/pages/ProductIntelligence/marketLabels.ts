import type {
  ConfidenceLevel,
  GeoMarket,
  GeoScope,
  Geography,
  Offering,
  ProductProfile,
} from '../../api/intelligence';

export const SCOPE_LABELS: Record<GeoScope, string> = {
  LOCAL: 'Local',
  CITY: 'City',
  SUBNATIONAL: 'Regional (within a country)',
  NATIONAL: 'National',
  MULTI_COUNTRY: 'Several countries',
  CONTINENTAL_OR_REGIONAL: 'Continental / regional',
  GLOBAL: 'Worldwide',
  MIXED: 'Mixed (differs by offering)',
  UNDETERMINED: 'Not determined',
};

export const KIND_LABELS: Record<Offering['kind'], string> = {
  product: 'Product',
  service: 'Service',
  plan: 'Plan',
  feature: 'Capability',
};

export const STATUS_LABELS: Record<Offering['status'], string> = {
  confirmed: 'Confirmed',
  inferred: 'Inferred',
  unverified: 'Unverified',
};

export function confidenceLabel(value: ConfidenceLevel | null | undefined): string {
  if (!value || value === 'none') return 'no confidence';
  return `${value} confidence`;
}

export interface MarketSection {
  key: keyof Geography;
  title: string;
  /** What the markets in this section mean. */
  hint: string;
  tone: 'confirmed' | 'stated' | 'observed' | 'unverified' | 'excluded';
  markets: GeoMarket[];
}

/** Market sections in display order; empty sections are omitted. */
export function marketSections(geo: Geography): MarketSection[] {
  const sections: Omit<MarketSection, 'markets'>[] = [
    { key: 'operational_markets', title: 'Confirmed operational markets', tone: 'confirmed',
      hint: 'Where the website or the customer states the offering is available.' },
    { key: 'target_markets', title: 'Intended target markets', tone: 'stated',
      hint: 'Markets the business says it is aiming for; not confirmed availability.' },
    { key: 'headquarters', title: 'Headquarters', tone: 'observed',
      hint: 'Where the business is based. Not a limit on where it sells.' },
    { key: 'offices', title: 'Offices and branches', tone: 'observed',
      hint: 'Physical locations named on the website.' },
    { key: 'regulatory', title: 'Licensed or regulated in', tone: 'stated',
      hint: 'Licences or regulators the website names.' },
    { key: 'observed_demand_markets', title: 'Observed demand', tone: 'observed',
      hint: 'Countries with clicks, sessions or conversions. Demand is not availability.' },
    { key: 'visibility_markets', title: 'Search visibility', tone: 'observed',
      hint: 'Countries where the site appeared in search results.' },
    { key: 'competitive_markets', title: 'Competitive markets', tone: 'observed',
      hint: 'Markets where direct competitors operate. Not a target by itself.' },
    { key: 'unverified_markets', title: 'Unverified signals', tone: 'unverified',
      hint: 'Weak hints only (domain, currency, language, phone number).' },
    { key: 'excluded_markets', title: 'Not available in', tone: 'excluded',
      hint: 'Markets the website or customer excludes.' },
  ];
  return sections
    .map((section) => ({ ...section, markets: (geo[section.key] as GeoMarket[] | undefined) ?? [] }))
    .filter((section) => section.markets.length > 0);
}

/** One-sentence summary of the scope; never presents an unknown scope as a market. */
export function scopeSummary(geo: Geography): string {
  if (geo.scope === 'UNDETERMINED') {
    if (geo.conflicts.length) {
      return `Not determined: the evidence conflicts (${geo.conflicts.join('; ')}).`;
    }
    return 'Not determined: the website does not say where the offering is available.';
  }
  const markets = geo.operational_markets.map((m) => m.name);
  const label = SCOPE_LABELS[geo.scope];
  if (geo.scope === 'MIXED' || markets.length === 0) return `${label} (${confidenceLabel(geo.confidence)}).`;
  return `${label}: ${markets.join(', ')} (${confidenceLabel(geo.confidence)}).`;
}

/** Offerings scoped differently from the site, worth listing separately. */
export function distinctOfferingScopes(geo: Geography) {
  return geo.offerings.filter((o) => !o.uses_site_wide_evidence && o.scope !== 'UNDETERMINED');
}

export interface OfferingDisplay {
  state: 'identified' | 'unresolved' | 'legacy' | 'empty';
  offerings: Offering[];
  /** Plain names when the profile predates offering provenance. */
  legacyNames: string[];
  missing: string[];
}

/** What the Services / Products card shows, from the authoritative profile. */
export function offeringDisplay(product: ProductProfile): OfferingDisplay {
  const result = product.offerings;
  if (result) {
    return {
      state: result.state,
      offerings: result.offerings,
      legacyNames: [],
      missing: result.missing,
    };
  }
  const legacyNames = [...(product.products ?? []), ...(product.services ?? [])];
  return {
    state: legacyNames.length ? 'legacy' : 'empty',
    offerings: [],
    legacyNames,
    missing: [],
  };
}
