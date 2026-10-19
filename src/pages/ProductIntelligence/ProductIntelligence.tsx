import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Globe2,
  MapPin,
  Package,
  RefreshCw,
  Target,
} from 'lucide-react';
import {
  getIntelligenceSummary,
  type IntelligenceSummary,
} from '../../api/intelligence';
import { listWebsites, type Website } from '../../api/websites';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';
import { MarketIntelligence, OfferingsList } from './MarketIntelligence';

function formatConfidence(value: number | null | undefined) {
  if (value == null) return '—';
  return `${Math.round(value * 100)}%`;
}

function DetailCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
        <Icon size={17} />
        {label}
      </div>
      <div className="text-sm leading-6 text-[var(--text-primary)]">
        {children}
      </div>
    </div>
  );
}

export default function ProductIntelligence() {
  const { selectedRunId } = useIntelligenceRun();
  const [website, setWebsite] = useState<Website | null>(null);
  const [data, setData] = useState<IntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    try {
      setError('');
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const websites = await listWebsites();

      if (!websites.length) {
        setWebsite(null);
        setData(null);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      const summary = await getIntelligenceSummary(selectedWebsite.id, selectedRunId ?? undefined);
      setData(summary);
    } catch (err) {
      console.error(err);
      setError('Unable to load product intelligence.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [, selectedRunId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="animate-spin" size={22} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
        <button
          onClick={() => void load(true)}
          className="mt-4 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!website || !data?.product) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
        <div className="flex items-center gap-3">
          <Building2 size={22} />
          <div>
            <h1 className="text-lg font-semibold">Product Intelligence</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Product understanding has not been generated yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const product = data.product;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Building2 size={16} />
            Data Engine
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Product Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
            The machine-understood identity of the connected product and website.
          </p>
        </div>

        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Business / Product</p>
            <h2 className="mt-1 text-xl font-semibold">
              {product.business_name || 'Unnamed product'}
            </h2>

            {product.description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                {product.description}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border-color)] px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)]">Model confidence</p>
            <p className="mt-1 text-lg font-semibold">
              {formatConfidence(product.confidence)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailCard icon={Package} label="Category">
          {product.category || 'Not identified'}
        </DetailCard>

        <DetailCard icon={Globe2} label="Connected website">
          {website.domain || website.url}
        </DetailCard>

        <DetailCard icon={Target} label="Services / Products">
          <OfferingsList product={product} />
        </DetailCard>

        <DetailCard icon={MapPin} label="Locations and markets">
          <MarketIntelligence product={product} />
        </DetailCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">Queries discovered</p>
          <p className="mt-2 text-2xl font-semibold">{data.queries_discovered}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">Competitors</p>
          <p className="mt-2 text-2xl font-semibold">{data.competitors_found}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">Gaps</p>
          <p className="mt-2 text-2xl font-semibold">{data.gaps_found}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">Opportunities</p>
          <p className="mt-2 text-2xl font-semibold">{data.opportunities}</p>
        </div>
      </div>
    </div>
  );
}
