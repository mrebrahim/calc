import { payCycle } from './date';
import { listCategories } from '../db/repo/categories';
import { totalsByCategory } from '../db/repo/transactions';

export interface BudgetRow {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  limit: number | null;
  spent: number;
  /** spent / limit, capped for rendering. null when no limit is set. */
  ratio: number | null;
}

export const NEAR_LIMIT_RATIO = 0.8;

/** Budgets follow the pay cycle, not the calendar month. */
export async function budgetStatus(salaryDay: number, now = new Date()): Promise<BudgetRow[]> {
  const { start, end } = payCycle(now, salaryDay);
  const [categories, totals] = await Promise.all([listCategories(), totalsByCategory(start, end)]);
  const spentByCategory = new Map(totals.map((row) => [row.category_id, row.total]));

  return categories.map((c) => {
    const spent = spentByCategory.get(c.id) ?? 0;
    return {
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      limit: c.monthly_limit,
      spent,
      ratio: c.monthly_limit && c.monthly_limit > 0 ? spent / c.monthly_limit : null,
    };
  });
}

/** Free tier allows two category budgets; Pro removes the cap. */
export const FREE_BUDGET_LIMIT = 2;
