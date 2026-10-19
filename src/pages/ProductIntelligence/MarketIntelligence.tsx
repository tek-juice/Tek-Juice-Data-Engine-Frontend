import type { Geography, Offering, ProductProfile } from '../../api/intelligence';
import {
  KIND_LABELS,
  SCOPE_LABELS,
  STATUS_LABELS,
  confidenceLabel,
  distinctOfferingScopes,
  marketSections,
  offeringDisplay,
  scopeSummary,
  type MarketSection,
} from './marketLabels';

const TONE_CLASSES: Record<string, string> = {
  confirmed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  inferred: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
  stated: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
  observed: 'border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-secondary)]',
  unverified: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  excluded: 'border-red-500/30 bg-red-500/5 text-red-500',
};

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone] ?? TONE_CLASSES.observed}`}>
      {children}
    </span>
  );
}

function evidenceTitle(offering: Offering): string {
  return offering.evidence
    .map((e) => `${e.reliability}: ${e.observation}${e.source ? ` (${e.source})` : ''}`)
    .join('\n');
}

/** "Services / Products": offerings with status and provenance, or why none were found. */
export function OfferingsList({ product }: { product: ProductProfile }) {
  const display = offeringDisplay(product);

  if (display.state === 'legacy') {
    return (
      <div>
        <p>{display.legacyNames.join(', ')}</p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Built before evidence was recorded for each offering; run the analysis again to see provenance.
        </p>
      </div>
    );
  }
  if (display.state === 'empty') {
    return <p>Not identified. Run the analysis again to identify products and services from the website.</p>;
  }

  const supported = display.offerings.filter((o) => o.status !== 'unverified');
  const unverified = display.offerings.filter((o) => o.status === 'unverified');

  return (
    <div className="space-y-3">
      {display.state === 'unresolved' && (
        <div>
          <p className="font-medium">Not identified from the website.</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-[var(--text-secondary)]">
            {display.missing.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      )}
      {supported.length > 0 && (
        <ul className="space-y-1.5" aria-label="Identified offerings">
          {supported.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2" title={evidenceTitle(o)}>
              <span>{o.name}</span>
              <Badge tone="observed">{KIND_LABELS[o.kind]}</Badge>
              <Badge tone={o.status}>{STATUS_LABELS[o.status]}</Badge>
              <span className="text-xs text-[var(--text-secondary)]">
                {confidenceLabel(o.confidence)} · {o.evidence[0]?.type.replace('_', ' ')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {unverified.length > 0 && (
        <p className="text-xs text-[var(--text-secondary)]">
          Not on the website (unverified, not used): {unverified.map((o) => o.name).join(', ')}
        </p>
      )}
    </div>
  );
}

function Section({ section }: { section: MarketSection }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">{section.title}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {section.markets.map((m) => (
          <span key={`${m.level}:${m.name}`} title={m.basis.join(', ')}>
            <Badge tone={section.tone}>
              {m.name}
              {section.tone === 'confirmed' && ` · ${m.confidence}`}
            </Badge>
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{section.hint}</p>
    </div>
  );
}

/** Geographic markets: scope, confirmed vs stated vs observed vs unverified. */
export function MarketIntelligence({ product }: { product: ProductProfile }) {
  const geo: Geography | null | undefined = product.geography;

  if (!geo) {
    return (
      <div>
        {product.locations?.length ? <p>{product.locations.join(', ')}</p> : <p>Not determined.</p>}
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Geographic market intelligence was not computed for this run; run the analysis again.
        </p>
      </div>
    );
  }

  const sections = marketSections(geo);
  const offerings = distinctOfferingScopes(geo);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{SCOPE_LABELS[geo.scope]}</span>
          <Badge tone={geo.scope === 'UNDETERMINED' ? 'unverified' : 'confirmed'}>
            {confidenceLabel(geo.confidence)}
          </Badge>
        </div>
        <p className="mt-1">{scopeSummary(geo)}</p>
        {geo.scope === 'UNDETERMINED' && geo.missing_evidence.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-xs text-[var(--text-secondary)]">
            {geo.missing_evidence.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        )}
        {geo.scope !== 'UNDETERMINED' && geo.basis.length > 0 && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Based on: {geo.basis.join(' · ')}</p>
        )}
      </div>

      {offerings.length > 1 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">By offering</p>
          <ul className="mt-1 space-y-1">
            {offerings.map((o) => (
              <li key={o.offering}>
                {o.offering}: {SCOPE_LABELS[o.scope]}
                {o.operational_markets.length > 0 && ` (${o.operational_markets.map((m) => m.name).join(', ')})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.map((section) => <Section key={section.key} section={section} />)}

      {sections.length === 0 && (
        <p className="text-xs text-[var(--text-secondary)]">No geographic evidence was found on the website or in performance data.</p>
      )}
    </div>
  );
}
