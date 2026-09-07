import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getSettings, updateSettings } from '../db/repo/settings';
import { seedDefaultCategories } from '../db/repo/categories';
import { materialiseRecurring } from '../db/repo/recurring';
import { computeAllowance, type Allowance } from '../lib/allowance';
import { scheduleWeeklyReport } from '../notifications/weekly';
import { lastSyncAt, sync, type SyncStatus } from '../sync/engine';
import type { Settings } from '../db/types';

interface AppValue {
  ready: boolean;
  settings: Settings | null;
  allowance: Allowance | null;
  syncStatus: SyncStatus;
  lastSync: Date | null;
  /** Recompute derived numbers after a write. */
  refresh: () => Promise<void>;
  saveSettings: (patch: Parameters<typeof updateSettings>[0]) => Promise<void>;
  runSync: () => Promise<void>;
}

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const bootstrapped = useRef(false);

  const refresh = useCallback(async () => {
    const next = await getSettings();
    setSettings(next);
    setAllowance(await computeAllowance(next));
  }, []);

  const runSync = useCallback(async () => {
    setSyncStatus('syncing');
    const result = await sync();
    setSyncStatus(result.status);
    setLastSync(await lastSyncAt());
    // A pull can change salary, categories or transactions.
    if (result.pulled > 0) await refresh();
  }, [refresh]);

  const saveSettings = useCallback(
    async (patch: Parameters<typeof updateSettings>[0]) => {
      await updateSettings(patch);
      await refresh();
    },
    [refresh]
  );

  // First launch: seed, backfill recurring charges, then show the UI. Sync is
  // deliberately *after* the first paint — the app must open in under a second
  // with no network.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      try {
        await seedDefaultCategories();
        await materialiseRecurring();
      } finally {
        await refresh();
        setReady(true);
      }
      void runSync();
    })();
  }, [refresh, runSync]);

  // Reschedule the weekly notification whenever the numbers behind it change.
  useEffect(() => {
    if (!ready || !settings) return;
    void scheduleWeeklyReport(settings);
  }, [ready, settings]);

  // Coming back to the app is when a new day may have started and when
  // recurring charges may have come due.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state !== 'active' || !ready) return;
      void (async () => {
        await materialiseRecurring();
        await refresh();
        await runSync();
      })();
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [ready, refresh, runSync]);

  const value = useMemo<AppValue>(
    () => ({ ready, settings, allowance, syncStatus, lastSync, refresh, saveSettings, runSync }),
    [ready, settings, allowance, syncStatus, lastSync, refresh, saveSettings, runSync]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}
