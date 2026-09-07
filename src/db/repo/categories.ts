import { getDb } from '../client';
import { newId, nowIso } from '../ids';
import type { Category } from '../types';
import { DEFAULT_CATEGORIES } from '../../data/defaultCategories';

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.getAllAsync<Category>(
    'select * from categories where deleted_at is null order by sort_order asc, name asc'
  );
}

export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  return db.getFirstAsync<Category>('select * from categories where id = ?', id);
}

export async function createCategory(input: {
  name: string;
  icon?: string;
  color?: string;
  monthlyLimit?: number | null;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `insert into categories (id, slug, name, icon, color, is_default, monthly_limit, sort_order, dirty, updated_at)
     values (?, ?, ?, ?, ?, 0, ?, ?, 1, ?)`,
    id,
    `custom_${id}`,
    input.name,
    input.icon ?? 'pricetag',
    input.color ?? '#8E8E93',
    input.monthlyLimit ?? null,
    DEFAULT_CATEGORIES.length + 1,
    nowIso()
  );
  return id;
}

export async function setMonthlyLimit(id: string, limit: number | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'update categories set monthly_limit = ?, dirty = 1, updated_at = ? where id = ?',
    limit,
    nowIso(),
    id
  );
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'update categories set name = ?, dirty = 1, updated_at = ? where id = ?',
    name,
    nowIso(),
    id
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'update categories set deleted_at = ?, dirty = 1, updated_at = ? where id = ?',
    nowIso(),
    nowIso(),
    id
  );
}

/** Idempotent: safe to call on every launch. */
export async function seedDefaultCategories(): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllAsync<{ slug: string }>('select slug from categories');
  const known = new Set(existing.map((row) => row.slug));
  const missing = DEFAULT_CATEGORIES.filter((c) => !known.has(c.slug));
  if (missing.length === 0) return;

  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < missing.length; i += 1) {
      const c = missing[i];
      await db.runAsync(
        `insert into categories (id, slug, name, icon, color, is_default, sort_order, dirty, updated_at)
         values (?, ?, ?, ?, ?, 1, ?, 1, ?)`,
        newId(),
        c.slug,
        c.name,
        c.icon,
        c.color,
        DEFAULT_CATEGORIES.findIndex((d) => d.slug === c.slug),
        stamp
      );
    }
  });
}
