export interface User {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'hr';
  totalHolidayDays: number;
  mustChangePassword?: boolean;
}

export interface UserBalance {
  userId: string;
  name: string;
  totalHolidayDays: number;
  currentYear: number;
  usedDays: number;
  usedDaysCurrentYear: number;
  usedDaysOutsideCurrentYear: number;
  remainingDays: number;
}

export interface HolidayRequest {
  id: string;
  userId: string;
  user: User;
  startDate: string;
  endDate: string;
  workdaysCount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string;
  year: number;
}

export interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export interface HREmailDraft {
  to: string;
  subject: string;
  body: string;
}
