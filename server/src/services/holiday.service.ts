import axios from 'axios';
import { CompanyHoliday, ICompanyHoliday } from '../entities/CompanyHoliday';

const NAGER_API = 'https://date.nager.at/api/v3/PublicHolidays';

// Cache public holidays per year to avoid repeated API calls
const publicHolidayCache: Map<number, Set<string>> = new Map();

/**
 * Fetch official Netherlands public holidays from Nager.Date API.
 * Returns a Set of date strings in "YYYY-MM-DD" format.
 */
export async function getNLPublicHolidays(year: number): Promise<Set<string>> {
  if (publicHolidayCache.has(year)) {
    return publicHolidayCache.get(year)!;
  }

  const response = await axios.get<Array<{ date: string }>>(`${NAGER_API}/${year}/NL`);
  const dates = new Set(response.data.map((h) => h.date));
  publicHolidayCache.set(year, dates);
  return dates;
}

/**
 * Get all company holidays for a given year as a Set of "YYYY-MM-DD" strings.
 */
export async function getCompanyHolidays(year: number): Promise<Set<string>> {
  const holidays = await CompanyHoliday.find({ year });
  return new Set(holidays.map((h) => h.date));
}

/**
 * Get all company holidays for a year as full objects (for API responses).
 */
export async function getCompanyHolidayList(year: number): Promise<ICompanyHoliday[]> {
  return CompanyHoliday.find({ year });
}

/**
 * Add a company holiday.
 */
export async function addCompanyHoliday(name: string, date: string): Promise<ICompanyHoliday> {
  const year = new Date(date).getFullYear();
  return CompanyHoliday.create({ name, date, year });
}

/**
 * Remove a company holiday by ID.
 */
export async function removeCompanyHoliday(id: string): Promise<void> {
  await CompanyHoliday.findByIdAndDelete(id);
}
