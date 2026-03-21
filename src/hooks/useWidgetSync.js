import { useEffect } from 'react';
import { AppState, Platform, NativeModules } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { syncWidgetData } from '../lib/widgetSync';

const GROUP_ID = 'group.com.tali.app';

// When the app comes to foreground, check if the widget logged anything
// and sync those entries into SQLite.
export function useWidgetSync() {
  const db = useSQLiteContext();

  useEffect(() => {
    if (Platform.OS !== 'ios' || !NativeModules.SharedDefaults) return;

    const processPending = async () => {
      try {
        const pending = await NativeModules.SharedDefaults.getPendingLogs(GROUP_ID);
        if (!pending || pending.length === 0) return;

        for (const entry of pending) {
          await db.runAsync(
            `INSERT INTO logs (tracker_id, value, note, logged_at) VALUES (?, ?, ?, ?)`,
            entry.trackerId, null, 'Logged from widget', entry.loggedAt
          );
        }

        // Re-sync widget data with the now-complete log
        await syncWidgetData(db);
      } catch {
        // Best effort
      }
    };

    // Process on mount (app just opened)
    processPending();

    // Process on every foreground transition
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        processPending();
      }
    });

    return () => subscription.remove();
  }, [db]);
}
