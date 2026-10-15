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
  websites: Website[];
  selectWebsite: (websiteId: string) => void;
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

function websiteKey(): string {
  return `data_engine_selected_website:${getCurrentUserId() ?? 'anonymous'}`;
}

// An explicit run choice, with the newest completed run at that moment. The
// old key also stored automatic picks forever, so pages kept showing an old
// run after newer runs completed; it is no longer read.
function storageKey(websiteId: string): string {
  const userId = getCurrentUserId() ?? 'anonymous';
  return `data_engine_intelligence_run_choice:${userId}:${websiteId}`;
}

function legacyStorageKey(websiteId: string): string {
  const userId = getCurrentUserId() ?? 'anonymous';
  return `data_engine_selected_intelligence_run:${userId}:${websiteId}`;
}

export interface RunChoice {
  id: string;
  newestAtChoice: string | null;
}

/** The run pages show: the newest completed run, unless the user chose one
 * and no newer run has completed since. ``runs`` is newest first. */
export function chooseRun(
  runs: IntelligenceRun[],
  choice: RunChoice | null,
): string | null {
  const newest = runs.find(run => run.status === 'completed') ?? runs[0] ?? null;
  if (
    choice &&
    runs.some(run => run.id === choice.id) &&
    choice.newestAtChoice === (newest?.id ?? null)
  ) {
    return choice.id;
  }
  return newest?.id ?? null;
}

export function IntelligenceRunProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [website, setWebsite] = useState<Website | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [runs, setRuns] = useState<IntelligenceRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshRuns(preferredWebsiteId?: string) {
    setLoading(true);
    setError(null);

    try {
      const fetched = await listWebsites();
      setWebsites(fetched);

      if (!fetched.length) {
        setWebsite(null);
        setRuns([]);
        setSelectedRunId(null);
        return;
      }

      // Selected website: explicit choice, else the remembered one, else first.
      const wanted = preferredWebsiteId ?? storage.get<string>(websiteKey());
      const currentWebsite =
        fetched.find(item => item.id === wanted) ?? fetched[0];
      storage.set(websiteKey(), currentWebsite.id);
      setWebsite(currentWebsite);

      const fetchedRuns = await getIntelligenceRuns(currentWebsite.id);
      setRuns(fetchedRuns);

      storage.remove(legacyStorageKey(currentWebsite.id));
      const choice = storage.get<RunChoice>(storageKey(currentWebsite.id));
      const runId = chooseRun(fetchedRuns, choice);
      if (choice && choice.id !== runId) {
        storage.remove(storageKey(currentWebsite.id));
      }
      setSelectedRunId(runId);
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

  function selectWebsite(websiteId: string) {
    if (website?.id === websiteId) return;
    void refreshRuns(websiteId);
  }

  function selectRun(runId: string) {
    if (!runs.some(run => run.id === runId)) {
      return;
    }

    setSelectedRunId(runId);

    if (website) {
      const newest = chooseRun(runs, null);
      storage.set<RunChoice>(storageKey(website.id), { id: runId, newestAtChoice: newest });
    }
  }

  const selectedRun = useMemo(
    () => runs.find(run => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  const value = useMemo<IntelligenceRunContextValue>(
    () => ({
      website,
      websites,
      selectWebsite,
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
      websites,
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
