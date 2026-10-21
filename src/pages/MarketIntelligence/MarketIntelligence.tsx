import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  getMarketProfile,
  type MarketProfile,
} from '../../api/intelligence';
import { type Website } from '../../api/websites';
import { websitesFor } from '../../api/selectedWebsite';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';

export default function MarketIntelligence() {
  const { selectedRunId, website: chosenWebsite, loading: websitesLoading } = useIntelligenceRun();
  const [website, setWebsite] = useState<Website | null>(null);
  const [market, setMarket] = useState<MarketProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    try {
      setError('');
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const websites = await websitesFor(chosenWebsite);

      if (!websites.length) {
        setWebsite(null);
        setMarket(null);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      try {
        const profile = await getMarketProfile(selectedWebsite.id, selectedRunId ?? undefined);
        setMarket(profile);
        setAvailable(true);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setMarket(null);
          setAvailable(false);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load market intelligence.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRunId, chosenWebsite]);

  useEffect(() => {
    if (!websitesLoading) void load();
  }, [load, websitesLoading]);

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

  if (!website) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
        No connected website is available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Market Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
            Data Engine understanding of markets, audiences, search intent,
            related markets and adjacent topics.
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

      {!available || !market ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={21} className="mt-0.5" />

            <div>
              <h2 className="font-semibold">
                Market profile not generated yet
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                No canonical market intelligence profile has been persisted
                for this website yet. The Market Intelligence endpoint is
                connected and will display the profile when an intelligence
                run produces one.
              </p>

              <p className="mt-4 text-xs text-[var(--text-secondary)]">
                Connected website: {website.domain || website.url}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-6">
            <p className="text-sm text-[var(--text-secondary)]">
              Primary category
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {market.primary_category || 'Not identified'}
            </h2>

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Confidence:{' '}
              {market.confidence == null
                ? '—'
                : `${Math.round(market.confidence * 100)}%`}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MarketList
              title="Geographic markets"
              items={market.geographic_markets}
            />
            <MarketList
              title="Customer segments"
              items={market.customer_segments}
            />
            <MarketList
              title="Commercial intents"
              items={market.commercial_intents}
            />
            <MarketList
              title="Informational intents"
              items={market.informational_intents}
            />
            <MarketList
              title="Adjacent topics"
              items={market.adjacent_topics}
            />
            <MarketList
              title="Related markets"
              items={market.related_markets}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MarketList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5">
      <h2 className="font-medium">{title}</h2>

      {items?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-md border border-[var(--border-color)] px-2.5 py-1 text-xs"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          No data available.
        </p>
      )}
    </div>
  );
}
