import { useState, useCallback, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { syncWidgetData } from '../lib/widgetSync';

export function useLogs({ trackerId, limit } = {}) {
  const db = useSQLiteContext();
  const [logs, setLogs] = useState([]);

  const reload = useCallback(async () => {
    let sql = `SELECT l.*, t.name as tracker_name, t.icon as tracker_icon, t.type as tracker_type, t.color as tracker_color
      FROM logs l JOIN trackers t ON l.tracker_id = t.id WHERE 1=1`;
    const params = [];

    if (trackerId) { sql += ' AND l.tracker_id = ?'; params.push(trackerId); }
    sql += ' ORDER BY l.logged_at DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(limit); }

    setLogs(await db.getAllAsync(sql, ...params));
  }, [db, trackerId, limit]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const add = useCallback(async (tId, value, note) => {
    const result = await db.runAsync(
      `INSERT INTO logs (tracker_id, value, note, logged_at) VALUES (?, ?, ?, ?)`,
      tId, value || null, note || null, new Date().toISOString()
    );
    await reload();
    syncWidgetData(db);
    return result.lastInsertRowId;
  }, [db, reload]);

  const remove = useCallback(async (id) => {
    await db.runAsync(`DELETE FROM logs WHERE id = ?`, id);
    await reload();
    syncWidgetData(db);
  }, [db, reload]);

  return { logs, reload, add, remove };
}

export function useLastLog(trackerId, refreshKey) {
  const db = useSQLiteContext();
  const [lastLog, setLastLog] = useState(null);

  useFocusEffect(useCallback(() => {
    db.getFirstAsync(
      `SELECT * FROM logs WHERE tracker_id = ? ORDER BY logged_at DESC LIMIT 1`,
      trackerId
    ).then(setLastLog);
  }, [db, trackerId, refreshKey]));

  return lastLog;
}

export function useExportLogs() {
  const db = useSQLiteContext();

  return useCallback(async () => {
    return await db.getAllAsync(
      `SELECT l.logged_at, t.name as tracker, t.type, l.value, l.note
       FROM logs l JOIN trackers t ON l.tracker_id = t.id ORDER BY l.logged_at DESC`
    );
  }, [db]);
}
