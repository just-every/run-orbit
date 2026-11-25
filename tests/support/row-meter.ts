/** Counts the rows D1 reports reading and writing, per statement, for budget tests. */
export type RowMeter = { db: D1Database; reads: number; writes: number; reset(): void; top(count?: number): string };

export function rowMeter(db: D1Database): RowMeter {
  const rows = new Map<string, { reads: number; writes: number; calls: number }>();
  const inner = new WeakMap<object, D1PreparedStatement>(), text = new WeakMap<object, string>();
  const meter = { reads: 0, writes: 0 } as RowMeter;
  const record = (sql: string, meta: { rows_read?: number; rows_written?: number }) => {
    const reads = meta.rows_read ?? 0, writes = meta.rows_written ?? 0, key = sql.replace(/\s+/g, ' ').slice(0, 140), entry = rows.get(key) ?? { reads: 0, writes: 0, calls: 0 };
    entry.reads += reads; entry.writes += writes; entry.calls++; rows.set(key, entry);
    meter.reads += reads; meter.writes += writes;
  };
  const wrap = (statement: D1PreparedStatement, sql: string): D1PreparedStatement => {
    const wrapped = {
      bind: (...values: unknown[]) => wrap(statement.bind(...values), sql),
      run: async () => { const result = await statement.run(); record(sql, result.meta); return result; },
      all: async () => { const result = await statement.all(); record(sql, result.meta); return result; },
      first: async (column?: string) => { const result = await statement.all(); record(sql, result.meta); const row = (result.results[0] ?? null) as Record<string, unknown> | null; return column && row ? row[column] : row; },
      raw: (options?: { columnNames?: boolean }) => statement.raw(options as { columnNames: true }),
    } as unknown as D1PreparedStatement;
    inner.set(wrapped, statement); text.set(wrapped, sql);
    return wrapped;
  };
  meter.db = {
    prepare: (sql: string) => wrap(db.prepare(sql), sql),
    batch: async (statements: D1PreparedStatement[]) => {
      const results = await db.batch(statements.map(statement => inner.get(statement) ?? statement));
      results.forEach((result, index) => record(text.get(statements[index]) ?? 'batch statement', result.meta));
      return results;
    },
    exec: (sql: string) => db.exec(sql),
    dump: () => db.dump(),
  } as unknown as D1Database;
  meter.reset = () => { meter.reads = 0; meter.writes = 0; rows.clear(); };
  meter.top = (count = 5) => [...rows].sort((a, b) => b[1].reads - a[1].reads).slice(0, count).map(([sql, entry]) => `  ${entry.reads} rd ${entry.writes} wr x${entry.calls}  ${sql}`).join('\n');
  return meter;
}
