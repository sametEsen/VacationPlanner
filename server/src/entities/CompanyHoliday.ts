import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanyHoliday extends Document {
  name: string;
  date: string; // ISO date string: YYYY-MM-DD
  year: number;
}

const companyHolidaySchema = new Schema<ICompanyHoliday>({
  name: { type: String, required: true },
  date: { type: String, required: true },
  year: { type: Number, required: true, index: true },
});

export const CompanyHoliday = mongoose.model<ICompanyHoliday>('CompanyHoliday', companyHolidaySchema);
