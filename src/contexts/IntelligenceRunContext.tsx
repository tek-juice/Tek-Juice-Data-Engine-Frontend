import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { listWebsites, type Website } from '../api/websites';
import {
  getIntelligenceRuns,
  type IntelligenceRun,
} from '../api/intelligence';
import { storage } from '../services/storage';
import { getCurrentUserId } from '../services/auth.service';

interface IntelligenceRunContextValue {
  website: Website | null;
  runs: IntelligenceRun[];
  selectedRun: IntelligenceRun | null;
  selectedRunId: string | null;
  loading: boolean;
  error: string | null;
  selectRun: (runId: string) => void;
  refreshRuns: () => Promise<void>;
}

const IntelligenceRunContext =
  createContext<IntelligenceRunContextValue | undefined>(undefined);

function storageKey(websiteId: string): string {
  const userId = getCurrentUserId() ?? 'anonymous';
  return `data_engine_selected_intelligence_run:${userId}:${websiteId}`;
}

export function IntelligenceRunProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [website, setWebsite] = useState<Website | null>(null);
  const [runs, setRuns] = useState<IntelligenceRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshRuns() {
    setLoading(true);
    setError(null);

    try {
      const websites = await listWebsites();

      if (!websites.length) {
        setWebsite(null);
        setRuns([]);
        setSelectedRunId(null);
        return;
      }

      const currentWebsite = websites[0];
      setWebsite(currentWebsite);

      const fetchedRuns = await getIntelligenceRuns(currentWebsite.id);
      setRuns(fetchedRuns);

      const storedRunId = storage.get<string>(
        storageKey(currentWebsite.id),
      );

      const storedRun = storedRunId
        ? fetchedRuns.find(run => run.id === storedRunId)
        : null;

      if (storedRun) {
        setSelectedRunId(storedRun.id);
      } else {
        const availableRun = fetchedRuns.find(
          run => run.status === 'completed',
        ) ?? fetchedRuns[0] ?? null;

        setSelectedRunId(availableRun?.id ?? null);

        if (availableRun) {
          storage.set(storageKey(currentWebsite.id), availableRun.id);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load Intelligence Runs.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRuns();
  }, []);

  function selectRun(runId: string) {
    if (!runs.some(run => run.id === runId)) {
      return;
    }

    setSelectedRunId(runId);

    if (website) {
      storage.set(storageKey(website.id), runId);
    }
  }

  const selectedRun = useMemo(
    () => runs.find(run => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  const value = useMemo<IntelligenceRunContextValue>(
    () => ({
      website,
      runs,
      selectedRun,
      selectedRunId,
      loading,
      error,
      selectRun,
      refreshRuns,
    }),
    [
      website,
      runs,
      selectedRun,
      selectedRunId,
      loading,
      error,
    ],
  );

  return (
    <IntelligenceRunContext.Provider value={value}>
      {children}
    </IntelligenceRunContext.Provider>
  );
}

export function useIntelligenceRun(): IntelligenceRunContextValue {
  const context = useContext(IntelligenceRunContext);

  if (!context) {
    throw new Error(
      'useIntelligenceRun must be used inside IntelligenceRunProvider',
    );
  }

  return context;
}
