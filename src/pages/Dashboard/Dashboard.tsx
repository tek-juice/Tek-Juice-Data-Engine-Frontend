import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // used in FirstRunBanner
import {
  ChevronUp, ChevronDown, Minus, RefreshCw,
} from 'lucide-react';
import { getDashboardOverview, getDashboardDocuments } from '../../api/dashboard';
import type { DashboardOverview, DocumentListItem } from '../../types';

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: 'var(--surface-2)', borderRadius: 4 }}
    />
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, delta, loading }: {
  label: string; value: string | number; sub?: string; delta?: number; loading?: boolean;
}) {
  const up   = delta !== undefined && delta > 0;
  const down = delta !== undefined && delta < 0;

  if (loading) {
    return (
      <Card className="p-5 flex flex-col gap-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-3 w-14" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-3">
        <span
          className="text-xs font-bold uppercase"
          style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-[28px] font-bold leading-none tabular-nums"
        style={{ color: 'var(--text)' }}
      >
        {value}
      </div>
      {(sub || delta !== undefined) && (
        <div className="flex items-center gap-2 mt-2">
          {delta !== undefined && (
            <span
              className="flex items-center gap-0.5 text-sm font-semibold tabular-nums"
              style={{ color: up ? 'var(--success)' : down ? 'var(--danger)' : 'var(--text-3)' }}
            >
              {up ? <ChevronUp size={12} /> : down ? <ChevronDown size={12} /> : <Minus size={12} />}
              {Math.abs(delta)}%
            </span>
          )}
          {sub && (
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>{sub}</span>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, score, loading }: {
  label: string; score: number; loading?: boolean;
}) {
  const pct   = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80 ? 'var(--success)' :
    pct >= 60 ? 'var(--info)'    :
    pct >= 40 ? 'var(--warning)' :
               'var(--danger)';

  if (loading) return <Skeleton className="h-8 w-full" />;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 flex-shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <div className="flex-1 h-2 overflow-hidden" style={{ background: 'var(--surface-2)', borderRadius: 2 }}>
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color }}>{pct.toFixed(0)}</span>
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    live:          'var(--success)',
    connected:     'var(--success)',
    configuring:   'var(--warning)',
    not_installed: 'var(--text-3)',
    disconnected:  'var(--danger)',
    failed:        'var(--danger)',
    error:         'var(--danger)',
    pending:       'var(--text-3)',
    drafts_ready:  'var(--info)',
    resolved:      'var(--success)',
  };
  const color = map[status] ?? 'var(--text-3)';
  const label = status.replace(/_/g, ' ');

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-bold capitalize"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border:     `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        borderRadius: 4,
      }}
    >
      {label}
    </span>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ lastUpdated, onRefresh, refreshing }: {
  lastUpdated: Date; onRefresh: () => void; refreshing: boolean;
}) {
  const date = lastUpdated.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <header
      className="flex items-center justify-between px-7 py-4 flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
          Last updated {date}
        </p>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded transition-colors disabled:opacity-40"
        style={{ background: 'var(--brand)', color: '#111' }}
        onMouseEnter={e => { if (!refreshing) e.currentTarget.style.background = 'var(--brand-light)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; }}
      >
        <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </header>
  );
}

// ─── First-run empty state ────────────────────────────────────────────────────

function FirstRunBanner() {
  return (
    <Card className="p-8">
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>
        Welcome to Data Engine
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 520 }}>
        Your account is ready. Connect your product to start the first crawl —
        keywords, content scores and traffic insights will appear here automatically.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/connect"
          className="px-5 py-3 rounded text-sm font-bold transition-colors"
          style={{ background: 'var(--brand)', color: '#111' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
        >
          Connect your product
        </Link>
        <Link
          to="/credentials"
          className="px-5 py-3 rounded text-sm font-bold transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        >
          Manage API Keys
        </Link>
      </div>
    </Card>
  );
}

// ─── Root Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [overview,  setOverview]  = useState<DashboardOverview | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAll = useCallback(async () => {
    const [ov, docs] = await Promise.allSettled([
      getDashboardOverview(),
      getDashboardDocuments({ page: 1, page_size: 20 }),
    ]);
    if (ov.status   === 'fulfilled') setOverview(ov.value);
    if (docs.status === 'fulfilled') setDocuments(docs.value);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Derived from real backend fields
  const noData             = !loading && !overview;
  const docsCompleted      = (overview as unknown as Record<string, number> | null)?.documents_completed ?? 0;
  const docsFailed         = (overview as unknown as Record<string, number> | null)?.documents_failed    ?? 0;
  const totalChunks        = (overview as unknown as Record<string, number> | null)?.total_chunks        ?? 0;
  const totalEmbeddings    = (overview as unknown as Record<string, number> | null)?.total_embeddings    ?? 0;
  const gapAnalysesRun     = (overview as unknown as Record<string, number> | null)?.gap_analyses_run    ?? 0;
  const schemasGenerated   = (overview as unknown as Record<string, number> | null)?.schemas_generated   ?? 0;
  const trendsToday        = (overview as unknown as Record<string, number> | null)?.trends_today        ?? 0;
  const isConnected        = docsCompleted > 0 || totalChunks > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <PageHeader lastUpdated={lastUpdated} onRefresh={handleRefresh} refreshing={refreshing} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-7 py-6 space-y-7">

          {/* ── First-run banner ── */}
          {noData && <FirstRunBanner />}

          {/* ── KPI strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Docs completed"  value={loading ? '—' : docsCompleted}    loading={loading} />
            <StatCard label="Docs failed"     value={loading ? '—' : docsFailed}       loading={loading} />
            <StatCard label="Total chunks"    value={loading ? '—' : totalChunks}      loading={loading} />
            <StatCard label="Embeddings"      value={loading ? '—' : totalEmbeddings}  loading={loading} />
            <StatCard label="Gap analyses"    value={loading ? '—' : gapAnalysesRun}   loading={loading} />
            <StatCard label="Trends today"    value={loading ? '—' : trendsToday}      loading={loading} />
          </div>

          {/* ── Engine status ── */}
          {(isConnected || loading) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Engine status</span>
                  {loading
                    ? <Skeleton className="h-5 w-16" />
                    : <StatusPill status={isConnected ? 'live' : 'pending'} />
                  }
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Docs processed"   score={docsCompleted > 0 ? 100 : 0}          loading={loading} />
                  <ScoreBar label="Chunks generated" score={totalChunks > 0 ? 100 : 0}            loading={loading} />
                  <ScoreBar label="Embeddings ready" score={totalEmbeddings > 0 ? 100 : 0}        loading={loading} />
                  <ScoreBar label="Gap analyses"     score={gapAnalysesRun > 0 ? 100 : 0}         loading={loading} />
                </div>
              </Card>

              <Card className="p-5 flex flex-col gap-3">
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Documents</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[40px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>
                    {loading ? '—' : documents.length}
                  </span>
                  <span className="text-base" style={{ color: 'var(--text-3)' }}>indexed</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {loading ? '' : `${schemasGenerated} schemas generated · ${trendsToday} trends today`}
                </p>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
