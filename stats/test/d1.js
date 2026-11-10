import { DatabaseSync } from 'node:sqlite'
import { readdirSync, readFileSync } from 'node:fs'

const dir = new URL('../migrations/', import.meta.url)

// The slice of D1's surface the data layer uses, over in-memory SQLite.
export function openTestDb() {
  const sqlite = new DatabaseSync(':memory:')
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(f, dir), 'utf8'))
  }
  const bound = (sql, args) => ({
    sql,
    args,
    // node:sqlite rows have a null prototype; D1's are plain objects
    async all() { return { results: sqlite.prepare(sql).all(...args).map((r) => ({ ...r })) } },
    async first() { const r = sqlite.prepare(sql).get(...args); return r ? { ...r } : null },
    async run() { sqlite.prepare(sql).run(...args); return { success: true } },
  })
  return {
    prepare: (sql) => ({ bind: (...args) => bound(sql, args), ...bound(sql, []) }),
    // D1 batches are transactional
    async batch(stmts) {
      sqlite.exec('BEGIN')
      try {
        const out = []
        for (const s of stmts) out.push(await s.run())
        sqlite.exec('COMMIT')
        return out
      } catch (e) {
        sqlite.exec('ROLLBACK')
        throw e
      }
    },
  }
}
