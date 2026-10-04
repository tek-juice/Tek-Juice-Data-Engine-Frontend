import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';

function formatDate(value: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusIcon(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === 'completed' || normalized === 'success') {
    return <CheckCircle2 size={18} />;
  }

  if (
    normalized === 'running' ||
    normalized === 'processing' ||
    normalized === 'started'
  ) {
    return <Loader2 size={18} className="animate-spin" />;
  }

  if (
    normalized === 'failed' ||
    normalized === 'error'
  ) {
    return <XCircle size={18} />;
  }

  return <Clock3 size={18} />;
}

function statusLabel(status: string) {
  if (!status) return 'Unknown';

  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function progressValue(progress: Record<string, unknown> | null) {
  if (!progress) return null;

  const candidates = [
    progress.percent,
    progress.percentage,
    progress.progress,
  ];

  const value = candidates.find(
    (candidate) => typeof candidate === 'number',
  );

  return typeof value === 'number' ? value : null;
}

export default function IntelligenceRuns() {
  const {
    website,
    runs,
    selectedRunId,
    loading,
    error: contextError,
    selectRun,
    refreshRuns,
  } = useIntelligenceRun();

  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await refreshRuns();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw size={22} className="animate-spin" />
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <span>{contextError}</span>
        </div>

        <button
          onClick={() => void handleRefresh()}
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
          <h1 className="text-2xl font-semibold">Intelligence Runs</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
            Select the Intelligence run whose persisted Data Engine results
            should be reflected throughout the application for{' '}
            {website.domain || website.url}.
          </p>
        </div>

        <button
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
          <h2 className="font-semibold">No intelligence runs</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No intelligence pipeline runs have been returned for this website.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)]">
          <div className="divide-y divide-[var(--border-color)]">
            {runs.map((run) => {
              const progress = progressValue(run.progress);
              const selected = run.id === selectedRunId;

              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => selectRun(run.id)}
                  className={`block w-full p-5 text-left transition ${
                    selected
                      ? 'bg-[var(--text-primary)]/[0.04]'
                      : 'hover:bg-[var(--text-primary)]/[0.02]'
                  }`}
                  aria-pressed={selected}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        {statusIcon(run.status)}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-medium">
                            {statusLabel(run.status)}
                          </h2>

                          {run.stage && (
                            <span className="rounded-md border border-[var(--border-color)] px-2 py-1 text-xs">
                              {statusLabel(run.stage)}
                            </span>
                          )}

                          {selected && (
                            <span className="rounded-md border border-[var(--border-color)] px-2 py-1 text-xs font-medium">
                              Selected
                            </span>
                          )}
                        </div>

                        <p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">
                          {run.id}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-[var(--text-secondary)]">
                      Created {formatDate(run.created_at)}
                    </div>
                  </div>

                  {progress !== null && (
                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-xs text-[var(--text-secondary)]">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[var(--border-color)]">
                        <div
                          className="h-full rounded-full bg-[var(--text-primary)]"
                          style={{
                            width: `${Math.max(0, Math.min(100, progress))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <span className="text-[var(--text-secondary)]">
                        Started
                      </span>
                      <p className="mt-1">{formatDate(run.started_at)}</p>
                    </div>

                    <div>
                      <span className="text-[var(--text-secondary)]">
                        Completed
                      </span>
                      <p className="mt-1">{formatDate(run.completed_at)}</p>
                    </div>

                    <div>
                      <span className="text-[var(--text-secondary)]">
                        Stage
                      </span>
                      <p className="mt-1">{run.stage || '—'}</p>
                    </div>
                  </div>

                  {run.error && (
                    <div className="mt-4 flex gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500">
                      <AlertCircle size={17} className="mt-0.5 shrink-0" />
                      <span>{run.error}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
