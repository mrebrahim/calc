import { toMajor } from '../lib/money';

const LOCALE = 'ar-EG';

/**
 * Currency is rendered with Latin digits on purpose: Egyptian users read
 * prices in Latin digits everywhere else, and mixed digit systems inside an
 * RTL line are a common source of confusion.
 */
export function formatMoney(minor: number, currency = 'ج'): string {
  const value = toMajor(Math.abs(minor));
  const body = value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${minor < 0 ? '-' : ''}${body} ${currency}`;
}

export function formatCompact(minor: number, currency = 'ج'): string {
  const value = toMajor(Math.abs(minor));
  const body =
    value >= 1000
      ? `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}ألف`
      : value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${minor < 0 ? '-' : ''}${body} ${currency}`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

const dayFormatter = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const shortFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' });

export function formatDayLong(d: Date): string {
  return dayFormatter.format(d);
}

export function formatDayShort(d: Date): string {
  return shortFormatter.format(d);
}

export function formatTime(d: Date): string {
  return timeFormatter.format(d);
}

/** "النهاردة" / "امبارح" / an actual date. */
export function formatRelativeDay(d: Date, now = new Date()): string {
  const a = new Date(d).setHours(0, 0, 0, 0);
  const b = new Date(now).setHours(0, 0, 0, 0);
  const diff = Math.round((b - a) / 86_400_000);
  if (diff === 0) return 'النهاردة';
  if (diff === 1) return 'امبارح';
  if (diff > 1 && diff < 7) return `من ${diff} أيام`;
  return formatDayShort(d);
}
