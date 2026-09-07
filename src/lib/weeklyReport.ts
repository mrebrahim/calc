import { addDays, startOfDay, startOfWeek } from './date';
import { formatMoney, formatPercent } from '../i18n/format';
import { sumBetween, totalsByCategory, transactionsBetween } from '../db/repo/transactions';
import type { CategoryTotal, TransactionWithCategory } from '../db/repo/transactions';

export interface WeeklyReport {
  from: Date;
  to: Date;
  total: number;
  previousTotal: number;
  /** Signed ratio vs. last week; null when last week had nothing to compare. */
  change: number | null;
  byCategory: CategoryTotal[];
  topExpenses: TransactionWithCategory[];
}

export async function buildWeeklyReport(now = new Date()): Promise<WeeklyReport> {
  const from = startOfWeek(now);
  const to = addDays(from, 7);
  const prevFrom = addDays(from, -7);

  const [total, previousTotal, byCategory, all] = await Promise.all([
    sumBetween(from, to, 'expense'),
    sumBetween(prevFrom, from, 'expense'),
    totalsByCategory(from, to),
    transactionsBetween(from, to),
  ]);

  const topExpenses = all
    .filter((tx) => tx.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return {
    from,
    to,
    total,
    previousTotal,
    change: previousTotal > 0 ? (total - previousTotal) / previousTotal : null,
    byCategory,
    topExpenses,
  };
}

/**
 * One sentence. The PRD is explicit about this: more than one line and the
 * user turns notifications off.
 */
export function weeklyHeadline(report: WeeklyReport, currency = 'ج'): string {
  const spend = formatMoney(report.total, currency);
  if (report.total === 0) {
    return 'مسجّلتش أي مصروف الأسبوع ده — كل حاجة تمام ولا نسيت تسجّل؟';
  }

  const parts = [`صرفت ${spend} الأسبوع ده`];
  if (report.change !== null && Math.abs(report.change) >= 0.05) {
    const pct = formatPercent(Math.abs(report.change));
    parts.push(report.change > 0 ? `أعلى ${pct} من الأسبوع اللي فات` : `أقل ${pct} من الأسبوع اللي فات`);
  }
  const top = report.byCategory[0];
  if (top) parts.push(`أكتر بند: ${top.name} ${formatMoney(top.total, currency)}`);

  return `${parts[0]}${parts[1] ? ` — ${parts[1]}` : ''}${parts[2] ? `. ${parts[2]}.` : '.'}`;
}
