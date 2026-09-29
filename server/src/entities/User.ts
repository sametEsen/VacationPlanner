import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'employee' | 'manager' | 'hr';

export interface IUser extends Document {
  name: string;
  email: string;
  role: UserRole;
  totalHolidayDays: number;
  passwordHash?: string;
  mustChangePassword: boolean;
  authVersion: number;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['employee', 'manager', 'hr'], default: 'employee' },
  totalHolidayDays: { type: Number, default: 25 },
  passwordHash: { type: String, select: false },
  mustChangePassword: { type: Boolean, default: false },
  authVersion: { type: Number, default: 0, select: false },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_document, result) => {
    const safeResult = result as unknown as Record<string, unknown>;
    delete safeResult.passwordHash;
    delete safeResult.authVersion;
    return safeResult;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);
