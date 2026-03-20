import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';

function parseConfig(row) {
  return { ...row, config: JSON.parse(row.config) };
}

export function useTrackers() {
  const db = useSQLiteContext();
  const [trackers, setTrackers] = useState([]);

  const reload = useCallback(async () => {
    const rows = await db.getAllAsync(
      `SELECT * FROM trackers WHERE archived = 0 ORDER BY sort_order, id`
    );
    setTrackers(rows.map(parseConfig));
  }, [db]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const create = useCallback(async ({ name, type, icon, color, config }) => {
    const maxRow = await db.getFirstAsync(`SELECT MAX(sort_order) as m FROM trackers`);
    await db.runAsync(
      `INSERT INTO trackers (name, type, icon, color, config, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      name, type || 'custom', icon || '📝', color || '#6366f1',
      JSON.stringify(config || {}), (maxRow.m || 0) + 1
    );
    await reload();
  }, [db, reload]);

  const update = useCallback(async (id, updates) => {
    const tracker = await db.getFirstAsync(`SELECT * FROM trackers WHERE id = ?`, id);
    if (!tracker) return;
    await db.runAsync(
      `UPDATE trackers SET name=?, icon=?, color=?, config=?, sort_order=?, archived=? WHERE id=?`,
      updates.name ?? tracker.name,
      updates.icon ?? tracker.icon,
      updates.color ?? tracker.color,
      JSON.stringify(updates.config ?? JSON.parse(tracker.config)),
      updates.sort_order ?? tracker.sort_order,
      updates.archived ?? tracker.archived,
      id
    );
    await reload();
  }, [db, reload]);

  return { trackers, reload, create, update };
}
