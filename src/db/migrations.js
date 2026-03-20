// Called by SQLiteProvider's onInit — runs before any screen renders.
export async function migrateDb(db) {
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

  // Seed default trackers if the table is empty
  const row = await db.getFirstAsync('SELECT COUNT(*) as c FROM trackers');
  if (row.c === 0) {
    await seedDefaults(db);
  }
}

async function seedDefaults(db) {
  const insert = (name, type, icon, color, config, order) =>
    db.runAsync(
      `INSERT INTO trackers (name, type, icon, color, config, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      name, type, icon, color, JSON.stringify(config), order
    );

  await insert('ADHD Meds', 'medication', '💊', '#8b5cf6', {
    doses: ['5mg', '10mg', '15mg', '20mg', '25mg', '30mg'],
    defaultDose: '20mg',
  }, 0);
  await insert('Cardio', 'exercise', '🏃', '#ef4444', {
    options: ['Run', 'Bike', 'Walk', 'Swim', 'Other'],
  }, 1);
  await insert('Strength', 'exercise', '💪', '#f59e0b', {
    options: ['Upper', 'Lower', 'Full Body', 'Core', 'Other'],
  }, 2);
}
