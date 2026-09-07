import { getDb } from '../client';
import { newId, nowIso } from '../ids';
import { toIso } from '../../lib/date';
import type { Transaction, TxSource, TxType } from '../types';

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
}

const WITH_CATEGORY = `
  select t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
  from transactions t
  left join categories c on c.id = t.category_id
  where t.deleted_at is null
`;

export async function addTransaction(input: {
  amount: number;
  type?: TxType;
  categoryId?: string | null;
  note?: string | null;
  occurredAt?: Date;
  source?: TxSource;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `insert into transactions (id, amount, type, category_id, note, occurred_at, source, dirty, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    id,
    input.amount,
    input.type ?? 'expense',
    input.categoryId ?? null,
    input.note?.trim() || null,
    toIso(input.occurredAt ?? new Date()),
    input.source ?? 'manual',
    nowIso()
  );
  return id;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  const stamp = nowIso();
  await db.runAsync(
    'update transactions set deleted_at = ?, dirty = 1, updated_at = ? where id = ?',
    stamp,
    stamp,
    id
  );
}

export async function recentTransactions(limit = 5): Promise<TransactionWithCategory[]> {
  const db = await getDb();
  return db.getAllAsync<TransactionWithCategory>(
    `${WITH_CATEGORY} order by t.occurred_at desc limit ?`,
    limit
  );
}

export async function transactionsBetween(
  from: Date,
  to: Date
): Promise<TransactionWithCategory[]> {
  const db = await getDb();
  return db.getAllAsync<TransactionWithCategory>(
    `${WITH_CATEGORY} and t.occurred_at >= ? and t.occurred_at < ? order by t.occurred_at desc`,
    toIso(from),
    toIso(to)
  );
}

/** Total of one type in a window, in minor units. */
export async function sumBetween(from: Date, to: Date, type: TxType = 'expense'): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `select sum(amount) as total from transactions
     where deleted_at is null and type = ? and occurred_at >= ? and occurred_at < ?`,
    type,
    toIso(from),
    toIso(to)
  );
  return row?.total ?? 0;
}

export interface CategoryTotal {
  category_id: string | null;
  name: string;
  icon: string;
  color: string;
  total: number;
}

export async function totalsByCategory(from: Date, to: Date): Promise<CategoryTotal[]> {
  const db = await getDb();
  return db.getAllAsync<CategoryTotal>(
    `select t.category_id as category_id,
            coalesce(c.name, 'متنوع')  as name,
            coalesce(c.icon, 'ellipsis-horizontal') as icon,
            coalesce(c.color, '#8E8E93') as color,
            sum(t.amount) as total
     from transactions t
     left join categories c on c.id = t.category_id
     where t.deleted_at is null and t.type = 'expense'
       and t.occurred_at >= ? and t.occurred_at < ?
     group by t.category_id
     order by total desc`,
    toIso(from),
    toIso(to)
  );
}

/** The category the user picks most often — used to preselect on the add screen. */
export async function mostUsedCategoryId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ category_id: string | null }>(
    `select category_id from transactions
     where deleted_at is null and category_id is not null and type = 'expense'
     group by category_id order by count(*) desc limit 1`
  );
  return row?.category_id ?? null;
}

export async function countTransactions(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'select count(*) as n from transactions where deleted_at is null'
  );
  return row?.n ?? 0;
}
