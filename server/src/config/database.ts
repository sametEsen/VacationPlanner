import mongoose from 'mongoose';

// Relies on the caller having already loaded environment variables (dotenv.config in app.ts/seed.ts).
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  await mongoose.connect(uri);
}
