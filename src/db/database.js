import * as SQLite from 'expo-sqlite';

let db = null;

export async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('logger.db');
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trackers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('medication', 'exercise', 'custom')),
        icon TEXT DEFAULT '📝',
        color TEXT DEFAULT '#6366f1',
        config TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracker_id INTEGER NOT NULL,
        value TEXT,
        note TEXT,
        logged_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (tracker_id) REFERENCES trackers(id)
      );
    `);

    // Seed defaults if empty
    const row = await db.getFirstAsync('SELECT COUNT(*) as c FROM trackers');
    if (row.c === 0) {
      await db.runAsync(
        'INSERT INTO trackers (name, type, icon, color, config, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        'ADHD Meds', 'medication', '💊', '#8b5cf6',
        JSON.stringify({ doses: ['5mg', '10mg', '15mg', '20mg', '25mg', '30mg'], defaultDose: '20mg' }),
        0
      );
      await db.runAsync(
        'INSERT INTO trackers (name, type, icon, color, config, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        'Cardio', 'exercise', '🏃', '#ef4444',
        JSON.stringify({ options: ['Run', 'Bike', 'Walk', 'Swim', 'Other'] }),
        1
      );
      await db.runAsync(
        'INSERT INTO trackers (name, type, icon, color, config, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        'Strength', 'exercise', '💪', '#f59e0b',
        JSON.stringify({ options: ['Upper', 'Lower', 'Full Body', 'Core', 'Other'] }),
        2
      );
    }
  }
  return db;
}

export async function getTrackers() {
  const db = await getDb();
  const rows = await db.getAllAsync(
    'SELECT * FROM trackers WHERE archived = 0 ORDER BY sort_order, id'
  );
  return rows.map(r => ({ ...r, config: JSON.parse(r.config) }));
}

export async function createTracker({ name, type, icon, color, config }) {
  const db = await getDb();
  const maxRow = await db.getFirstAsync('SELECT MAX(sort_order) as m FROM trackers');
  const result = await db.runAsync(
    'INSERT INTO trackers (name, type, icon, color, config, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    name, type || 'custom', icon || '📝', color || '#6366f1',
    JSON.stringify(config || {}), (maxRow.m || 0) + 1
  );
  const tracker = await db.getFirstAsync('SELECT * FROM trackers WHERE id = ?', result.lastInsertRowId);
  return { ...tracker, config: JSON.parse(tracker.config) };
}

export async function updateTracker(id, updates) {
  const db = await getDb();
  const tracker = await db.getFirstAsync('SELECT * FROM trackers WHERE id = ?', id);
  if (!tracker) return null;

  await db.runAsync(
    'UPDATE trackers SET name=?, icon=?, color=?, config=?, sort_order=?, archived=? WHERE id=?',
    updates.name ?? tracker.name,
    updates.icon ?? tracker.icon,
    updates.color ?? tracker.color,
    JSON.stringify(updates.config ?? JSON.parse(tracker.config)),
    updates.sort_order ?? tracker.sort_order,
    updates.archived ?? tracker.archived,
    id
  );
  const updated = await db.getFirstAsync('SELECT * FROM trackers WHERE id = ?', id);
  return { ...updated, config: JSON.parse(updated.config) };
}

export async function addLog(trackerId, value, note) {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO logs (tracker_id, value, note, logged_at) VALUES (?, ?, ?, ?)',
    trackerId, value || null, note || null, new Date().toISOString()
  );
  return await db.getFirstAsync('SELECT * FROM logs WHERE id = ?', result.lastInsertRowId);
}

export async function getLogs({ trackerId, from, to, limit } = {}) {
  const db = await getDb();
  let sql = `SELECT l.*, t.name as tracker_name, t.icon as tracker_icon, t.type as tracker_type, t.color as tracker_color
    FROM logs l JOIN trackers t ON l.tracker_id = t.id WHERE 1=1`;
  const params = [];

  if (trackerId) { sql += ' AND l.tracker_id = ?'; params.push(trackerId); }
  if (from) { sql += ' AND l.logged_at >= ?'; params.push(from); }
  if (to) { sql += ' AND l.logged_at <= ?'; params.push(to); }

  sql += ' ORDER BY l.logged_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(limit); }

  return await db.getAllAsync(sql, ...params);
}

export async function deleteLog(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM logs WHERE id = ?', id);
}

export async function getLastLog(trackerId) {
  const db = await getDb();
  return await db.getFirstAsync(
    'SELECT * FROM logs WHERE tracker_id = ? ORDER BY logged_at DESC LIMIT 1',
    trackerId
  );
}

export async function exportAllLogs() {
  const db = await getDb();
  return await db.getAllAsync(
    `SELECT l.logged_at, t.name as tracker, t.type, l.value, l.note
     FROM logs l JOIN trackers t ON l.tracker_id = t.id ORDER BY l.logged_at DESC`
  );
}
