import mongoose, { Schema, Document, Types } from 'mongoose';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface IHolidayRequest extends Document {
  userId: Types.ObjectId;
  startDate: string; // ISO date string: YYYY-MM-DD
  endDate: string;
  workdaysCount: number;
  status: RequestStatus;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const holidayRequestSchema = new Schema<IHolidayRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    workdaysCount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason: { type: String, default: '' },
  },
  { timestamps: true },
);

export const HolidayRequest = mongoose.model<IHolidayRequest>('HolidayRequest', holidayRequestSchema);
