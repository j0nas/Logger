import { Platform, NativeModules } from 'react-native';

const GROUP_ID = 'group.com.tali.app';

// Syncs a lightweight snapshot to shared UserDefaults for the iOS widget.
// This is safe — unlike sharing the SQLite file directly, UserDefaults
// doesn't risk SQLITE_BUSY crashes from cross-process locking.
export async function syncWidgetData(db) {
  if (Platform.OS !== 'ios') return;

  try {
    const trackers = await db.getAllAsync(
      `SELECT id, name, icon, color, type, config FROM trackers WHERE archived = 0 ORDER BY sort_order, id`
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayLogs = await db.getAllAsync(
      `SELECT l.tracker_id, l.value, l.logged_at, t.name as tracker_name, t.icon as tracker_icon
       FROM logs l JOIN trackers t ON l.tracker_id = t.id
       WHERE l.logged_at >= ?
       ORDER BY l.logged_at DESC`,
      todayStart.toISOString()
    );

    const snapshot = {
      trackers: trackers.map(t => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        color: t.color,
        type: t.type,
      })),
      todayLogs: todayLogs.map(l => ({
        trackerId: l.tracker_id,
        trackerName: l.tracker_name,
        trackerIcon: l.tracker_icon,
        value: l.value,
        loggedAt: l.logged_at,
      })),
      lastSyncedAt: new Date().toISOString(),
    };

    // Write to shared UserDefaults via native module
    // Falls back gracefully if the native module isn't available (e.g., Expo Go)
    if (NativeModules.SharedDefaults) {
      NativeModules.SharedDefaults.set(GROUP_ID, 'widgetData', JSON.stringify(snapshot));
    }
  } catch {
    // Widget sync is best-effort — never crash the main app
  }
}
