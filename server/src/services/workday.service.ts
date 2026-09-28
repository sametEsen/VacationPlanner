import { getNLPublicHolidays, getCompanyHolidays } from './holiday.service';

export interface WorkdayBreakdown {
  total: number;
  byYear: Record<number, number>;
}

/**
 * Count workdays between startDate and endDate (inclusive).
 *
 * Dutch labor rules:
 *  - 1 vacation week = 5 workdays
 *  - Weekends (Sat/Sun) are never deducted
 *  - Official NL public holidays are excluded
 *  - Company-defined holidays are excluded
 *
 * @param startDate - ISO string "YYYY-MM-DD"
 * @param endDate   - ISO string "YYYY-MM-DD"
 */
export async function countWorkdays(startDate: string, endDate: string): Promise<number> {
  const breakdown = await countWorkdaysBreakdown(startDate, endDate);
  return breakdown.total;
}

export async function countWorkdaysBreakdown(startDate: string, endDate: string): Promise<WorkdayBreakdown> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }
  if (start > end) {
    throw new Error('startDate must be before or equal to endDate.');
  }

  // Collect all years spanned by the range
  const years = new Set<number>();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.add(y);
  }

  // Fetch all public and company holidays for all spanned years
  const holidaySets = await Promise.all(
    [...years].map(async (year) => {
      const [pub, comp] = await Promise.all([
        getNLPublicHolidays(year),
        getCompanyHolidays(year),
      ]);
      return new Set([...pub, ...comp]);
    })
  );

  // Merge all holiday sets
  const allHolidays = new Set<string>();
  holidaySets.forEach((s) => s.forEach((d) => allHolidays.add(d)));

  let count = 0;
  const byYear: Record<number, number> = {};
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
    const dateStr = toISODate(current);

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = allHolidays.has(dateStr);

    if (!isWeekend && !isHoliday) {
      count++;
      const year = current.getFullYear();
      byYear[year] = (byYear[year] ?? 0) + 1;
    }

    current.setDate(current.getDate() + 1);
  }

  return { total: count, byYear };
}

/**
 * Format a Date as "YYYY-MM-DD" using local time (avoids UTC offset issues).
 */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
