import { getDb } from '../db/client';
import { nowIso } from '../db/ids';
import type { SyncableTable } from '../db/types';
import { ensureAnonymousUser, supabase } from './supabase';
import {
  SETTINGS_BOOLEANS,
  SETTINGS_COLUMNS,
  SYNC_ORDER,
  TABLES,
  type TableSpec,
} from './tables';

const PAGE_SIZE = 500;

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'offline' | 'error';

export interface SyncResult {
  status: SyncStatus;
  pushed: number;
  pulled: number;
  error?: string;
}

type Row = Record<string, unknown>;

function toServer(row: Row, spec: TableSpec, userId: string): Row {
  const out: Row = { user_id: userId };
  for (const column of spec.columns) {
    const value = row[column];
    out[column] = spec.booleans.includes(column) ? value === 1 || value === true : value;
  }
  return out;
}

function toLocal(row: Row, spec: TableSpec): Row {
  const out: Row = {};
  for (const column of spec.columns) {
    const value = row[column];
    out[column] = spec.booleans.includes(column) ? (value ? 1 : 0) : (value ?? null);
  }
  return out;
}

async function getCursor(table: string): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ last_pulled: string }>(
    'select last_pulled from sync_state where table_name = ?',
    table
  );
  return row?.last_pulled ?? '1970-01-01T00:00:00.000Z';
}

async function setCursor(table: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `insert into sync_state (table_name, last_pulled) values (?, ?)
     on conflict (table_name) do update set last_pulled = excluded.last_pulled`,
    table,
    value
  );
}

// --------------------------------------------------------------------- push

async function pushTable(table: SyncableTable, userId: string): Promise<number> {
  if (!supabase) return 0;
  const spec = TABLES[table];
  const db = await getDb();
  const dirty = await db.getAllAsync<Row>(`select * from ${table} where dirty = 1`);
  if (dirty.length === 0) return 0;

  let pushed = 0;
  for (let offset = 0; offset < dirty.length; offset += PAGE_SIZE) {
    const chunk = dirty.slice(offset, offset + PAGE_SIZE);
    const payload = chunk.map((row) => toServer(row, spec, userId));

    const { data, error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: 'id' })
      .select('id, updated_at');
    if (error) throw new Error(`${table}: ${error.message}`);

    // Take the server's updated_at back so the next pull does not re-deliver
    // rows this device just wrote.
    for (const row of data ?? []) {
      await db.runAsync(
        `update ${table} set dirty = 0, updated_at = ? where id = ?`,
        row.updated_at as string,
        row.id as string
      );
    }
    pushed += chunk.length;
  }
  return pushed;
}

async function pushSettings(userId: string): Promise<number> {
  if (!supabase) return 0;
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('select * from settings where id = 1 and dirty = 1');
  if (!row) return 0;

  const payload: Row = { user_id: userId };
  for (const column of SETTINGS_COLUMNS) {
    payload[column] = SETTINGS_BOOLEANS.includes(column) ? row[column] === 1 : row[column];
  }

  const { data, error } = await supabase
    .from('settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select('updated_at')
    .single();
  if (error) throw new Error(`settings: ${error.message}`);

  await db.runAsync('update settings set dirty = 0, updated_at = ? where id = 1', data.updated_at);
  return 1;
}

// --------------------------------------------------------------------- pull

async function pullTable(table: SyncableTable): Promise<number> {
  if (!supabase) return 0;
  const spec = TABLES[table];
  const db = await getDb();
  const since = await getCursor(table);

  const { data, error } = await supabase
    .from(table)
    .select(spec.columns.join(','))
    .gt('updated_at', since)
    .order('updated_at', { ascending: true })
    .limit(PAGE_SIZE);
  if (error) throw new Error(`${table}: ${error.message}`);

  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return 0;

  const placeholders = spec.columns.map(() => '?').join(', ');
  const updates = spec.columns.map((c) => `${c} = excluded.${c}`).join(', ');

  await db.withTransactionAsync(async () => {
    for (const remote of rows) {
      const local = toLocal(remote, spec);
      // A row with unpushed local edits keeps them; the next push wins.
      const pending = await db.getFirstAsync<{ dirty: number }>(
        `select dirty from ${table} where id = ?`,
        local.id as string
      );
      if (pending?.dirty === 1) continue;

      await db.runAsync(
        `insert into ${table} (${spec.columns.join(', ')}, dirty)
         values (${placeholders}, 0)
         on conflict (id) do update set ${updates}, dirty = 0`,
        ...spec.columns.map((c) => local[c] as string | number | null)
      );
    }
  });

  const newest = rows[rows.length - 1].updated_at as string;
  await setCursor(table, newest);
  return rows.length;
}

async function pullSettings(): Promise<number> {
  if (!supabase) return 0;
  const db = await getDb();
  const since = await getCursor('settings');

  const { data, error } = await supabase
    .from('settings')
    .select(SETTINGS_COLUMNS.join(','))
    .gt('updated_at', since)
    .maybeSingle();
  if (error) throw new Error(`settings: ${error.message}`);
  if (!data) return 0;

  const remote = data as unknown as Row;
  const pending = await db.getFirstAsync<{ dirty: number }>(
    'select dirty from settings where id = 1'
  );
  if (pending?.dirty === 1) return 0;

  const assignments = SETTINGS_COLUMNS.map((c) => `${c} = ?`).join(', ');
  const values = SETTINGS_COLUMNS.map((c) =>
    SETTINGS_BOOLEANS.includes(c) ? (remote[c] ? 1 : 0) : (remote[c] as string | number | null)
  );
  await db.runAsync(`update settings set ${assignments}, dirty = 0 where id = 1`, ...values);
  await setCursor('settings', remote.updated_at as string);
  return 1;
}

/**
 * Two installs seed the same default categories independently, so the same
 * slug can arrive from the server under a different id. Point local
 * transactions and rules at the server's id and drop the local duplicate,
 * otherwise the unique (user_id, slug) index rejects every future push.
 */
async function reconcileCategorySlugs(): Promise<void> {
  if (!supabase) return;
  const db = await getDb();
  const { data, error } = await supabase.from('categories').select('id, slug');
  if (error || !data) return;

  for (const remote of data as { id: string; slug: string }[]) {
    const local = await db.getFirstAsync<{ id: string }>(
      'select id from categories where slug = ? and id != ?',
      remote.slug,
      remote.id
    );
    if (!local) continue;

    await db.withTransactionAsync(async () => {
      // Free the slug before the remote row lands on it.
      await db.runAsync('update categories set slug = ? where id = ?', `dup_${local.id}`, local.id);
      await db.runAsync(
        `insert into categories (id, slug, name, icon, color, is_default, sort_order, dirty, updated_at)
         select ?, ?, name, icon, color, is_default, sort_order, 0, updated_at
         from categories where id = ?
         on conflict (id) do nothing`,
        remote.id,
        remote.slug,
        local.id
      );
      await db.runAsync(
        'update transactions set category_id = ?, dirty = 1, updated_at = ? where category_id = ?',
        remote.id,
        nowIso(),
        local.id
      );
      await db.runAsync(
        'update recurring set category_id = ?, dirty = 1, updated_at = ? where category_id = ?',
        remote.id,
        nowIso(),
        local.id
      );
      await db.runAsync('delete from categories where id = ?', local.id);
    });
  }
}

// ---------------------------------------------------------------- entrypoint

let inFlight: Promise<SyncResult> | null = null;

/**
 * Push local changes, then pull remote ones. Safe to call on every launch and
 * after every write — concurrent calls share one run, and a failure is never
 * fatal: the local database stays the source of truth.
 */
export function sync(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<SyncResult> {
  if (!supabase) return { status: 'offline', pushed: 0, pulled: 0 };

  const userId = await ensureAnonymousUser();
  if (!userId) return { status: 'offline', pushed: 0, pulled: 0 };

  let pushed = 0;
  let pulled = 0;
  try {
    // Categories are reconciled before anything references them.
    await reconcileCategorySlugs();

    for (const table of SYNC_ORDER) pushed += await pushTable(table, userId);
    pushed += await pushSettings(userId);

    for (const table of SYNC_ORDER) pulled += await pullTable(table);
    pulled += await pullSettings();

    await setCursor('__last_run', nowIso());
    return { status: 'ok', pushed, pulled };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[sync] failed:', message);
    return { status: 'error', pushed, pulled, error: message };
  }
}

export async function lastSyncAt(): Promise<Date | null> {
  const value = await getCursor('__last_run');
  const parsed = new Date(value);
  return value && parsed.getTime() > 0 ? parsed : null;
}
