import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'employee' | 'manager' | 'hr';

export interface IUser extends Document {
  name: string;
  email: string;
  role: UserRole;
  totalHolidayDays: number;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['employee', 'manager', 'hr'], default: 'employee' },
  totalHolidayDays: { type: Number, default: 25 },
});

export const User = mongoose.model<IUser>('User', userSchema);
