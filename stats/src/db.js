// D1 data layer. Missing values are absent rows, never zeros.

export async function upsertReadings(db, readings) {
  if (!readings.length) return
  const stmt = db.prepare(
    `INSERT INTO readings (source, metric, dim, date, value) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(source, metric, dim, date) DO UPDATE SET value = excluded.value`,
  )
  await db.batch(readings.map((r) => stmt.bind(r.source, r.metric, r.dim ?? '', r.date, r.value)))
}

export async function upsertItems(db, items) {
  if (!items.length) return
  const stmt = db.prepare(
    `INSERT INTO items (source, id, title, url, date) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(source, id) DO UPDATE SET title = excluded.title, url = excluded.url, date = excluded.date`,
  )
  await db.batch(items.map((i) => stmt.bind(i.source, i.id, i.title, i.url ?? null, i.date ?? null)))
}

export async function series(db, { source, metric, dim = '', from, to }) {
  const { results } = await db
    .prepare(
      `SELECT date, value FROM readings
       WHERE source = ? AND metric = ? AND dim = ? AND date BETWEEN ? AND ? ORDER BY date`,
    )
    .bind(source, metric, dim, from, to)
    .all()
  return results
}

// before is exclusive, so "the reading prior to this date" is one call
export function latest(db, { source, metric, dim = '', before }) {
  return db
    .prepare(
      `SELECT date, value FROM readings
       WHERE source = ? AND metric = ? AND dim = ? AND (? IS NULL OR date < ?)
       ORDER BY date DESC LIMIT 1`,
    )
    .bind(source, metric, dim, before ?? null, before ?? null)
    .first()
}

export async function dims(db, { source, metric, from, to }) {
  const { results } = await db
    .prepare(
      `SELECT dim, SUM(value) AS value FROM readings
       WHERE source = ? AND metric = ? AND date BETWEEN ? AND ?
       GROUP BY dim ORDER BY value DESC`,
    )
    .bind(source, metric, from, to)
    .all()
  return results
}

export async function getSetting(db, key) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first()
  return row ? row.value : null
}

export async function setSetting(db, key, value) {
  await db
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value)
    .run()
}

// A failed try must not erase when the source last worked.
export async function recordSync(db, { source, ok, error = null, at }) {
  const sql = ok
    ? `INSERT INTO syncs (source, last_ok, last_try, error) VALUES (?1, ?2, ?2, NULL)
       ON CONFLICT(source) DO UPDATE SET last_ok = ?2, last_try = ?2, error = NULL`
    : `INSERT INTO syncs (source, last_ok, last_try, error) VALUES (?1, NULL, ?2, ?3)
       ON CONFLICT(source) DO UPDATE SET last_try = ?2, error = ?3`
  await db.prepare(sql).bind(...(ok ? [source, at] : [source, at, error ?? 'error'])).run()
}

export async function syncStatus(db) {
  const { results } = await db.prepare('SELECT source, last_ok, last_try, error FROM syncs ORDER BY source').all()
  return results
}

export async function addEvent(db, { date, kind, text }) {
  await db.prepare('INSERT INTO events (date, kind, text) VALUES (?, ?, ?)').bind(date, kind, text).run()
}

export async function events(db, { from, to }) {
  const { results } = await db
    .prepare('SELECT id, date, kind, text FROM events WHERE date BETWEEN ? AND ? ORDER BY date, id')
    .bind(from, to)
    .all()
  return results
}

export async function getToken(db, source) {
  const row = await db
    .prepare('SELECT access_token, refresh_token, expires_at, meta FROM tokens WHERE source = ?')
    .bind(source)
    .first()
  return row ? { ...row, meta: row.meta ? JSON.parse(row.meta) : null } : null
}

export async function putToken(db, source, { access_token, refresh_token, expires_at, meta }) {
  await db
    .prepare(
      `INSERT INTO tokens (source, access_token, refresh_token, expires_at, meta) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(source) DO UPDATE SET access_token = excluded.access_token,
         refresh_token = excluded.refresh_token, expires_at = excluded.expires_at, meta = excluded.meta`,
    )
    .bind(source, access_token ?? null, refresh_token ?? null, expires_at ?? null, meta == null ? null : JSON.stringify(meta))
    .run()
}
