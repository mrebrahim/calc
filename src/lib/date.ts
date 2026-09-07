const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

/** Week starts on Saturday in Egypt (getDay() === 6). */
export function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  const shift = (out.getDay() + 1) % 7; // Sat -> 0, Sun -> 1, ... Fri -> 6
  out.setDate(out.getDate() - shift);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * The salary date for a given month, clamped to the last day when the
 * chosen day does not exist (e.g. the 31st in February).
 */
export function salaryDateFor(year: number, monthIndex: number, salaryDay: number): Date {
  const day = Math.min(salaryDay, daysInMonth(year, monthIndex));
  return startOfDay(new Date(year, monthIndex, day));
}

/** The pay cycle [start, end) that `now` falls inside. */
export function payCycle(now: Date, salaryDay: number): { start: Date; end: Date } {
  const today = startOfDay(now);
  const thisMonth = salaryDateFor(today.getFullYear(), today.getMonth(), salaryDay);
  const start =
    today.getTime() >= thisMonth.getTime()
      ? thisMonth
      : salaryDateFor(today.getFullYear(), today.getMonth() - 1, salaryDay);
  const end = salaryDateFor(start.getFullYear(), start.getMonth() + 1, salaryDay);
  return { start, end };
}

export function toIso(d: Date): string {
  return d.toISOString();
}

export function toDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
