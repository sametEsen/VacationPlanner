import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDB } from './config/database';
import { User } from './entities/User';
import { HolidayRequest } from './entities/HolidayRequest';
import { CompanyHoliday } from './entities/CompanyHoliday';
import { countWorkdays } from './services/workday.service';

async function seed() {
  await connectDB();
  console.log('Database connected. Seeding...');

  // --- Users: upsert by email (preserves references from existing requests) ---
  const userData = { name: 'Samet ESEN', email: 'samet.esen@kubota.com', role: 'employee' as const, totalHolidayDays: 40 };
  let user = await User.findOne({ email: userData.email });
  if (!user) {
    user = await User.create(userData);
    console.log(`Created user: ${user.name}`);
  } else {
    console.log(`Kept existing user: ${user.name}`);
  }

  // --- Company holidays: add defaults without removing existing records ---
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const defaultHolidays = [
    { name: 'Goede Vrijdag',  date: `${currentYear}-04-18`, year: currentYear },
    { name: 'Nieuwjaarsdag',  date: `${nextYear}-01-01`,    year: nextYear },
  ];

  let addedHolidays = 0;
  for (const h of defaultHolidays) {
    const exists = await CompanyHoliday.findOne({ name: h.name, date: h.date, year: h.year });
    if (!exists) {
      await CompanyHoliday.create(h);
      addedHolidays++;
    }
  }
  console.log(`Added ${addedHolidays} new company holiday(s), kept existing records.`);

  // --- Vacation requests: seed only if none exist yet for this user ---
  const existingRequests = await HolidayRequest.countDocuments({ userId: user.id });
  if (existingRequests === 0) {
    const vacations = [
      { startDate: `${currentYear}-04-16`, endDate: `${currentYear}-04-23` },
      { startDate: `${currentYear}-05-14`, endDate: `${currentYear}-05-18` },
    ];

    for (const v of vacations) {
      const workdaysCount = await countWorkdays(v.startDate, v.endDate);
      await HolidayRequest.create({
        userId: user.id,
        startDate: v.startDate,
        endDate: v.endDate,
        workdaysCount,
        status: 'approved',
        reason: '',
      });
      console.log(`Seeded request: ${v.startDate} → ${v.endDate} (${workdaysCount} workdays)`);
    }
  } else {
    console.log(`Kept ${existingRequests} existing vacation request(s) for ${user.name}.`);
  }

  await mongoose.disconnect();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

