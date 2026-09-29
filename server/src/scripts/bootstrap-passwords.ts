import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { User } from '../entities/User';
import { createTemporaryPassword, hashPassword } from '../services/password.service';

async function bootstrapPasswords(): Promise<void> {
  if (!process.argv.includes('--confirm')) {
    throw new Error('Refusing to run without explicit confirmation; use --confirm to generate credentials.');
  }

  await connectDB();
  const users = await User.find({ passwordHash: { $exists: false } }).select('+passwordHash');
  if (users.length === 0) {
    console.log('No accounts need initial passwords.');
    await mongoose.disconnect();
    return;
  }

  const credentials: Array<{ email: string; password: string }> = [];
  for (const user of users) {
    const password = createTemporaryPassword();
    user.passwordHash = await hashPassword(password);
    user.mustChangePassword = true;
    user.authVersion = (user.authVersion ?? 0) + 1;
    await user.save();
    credentials.push({ email: user.email, password });
  }

  console.log('One-time credentials. Deliver each through a separate secure channel, then clear this terminal output.');
  for (const credential of credentials) console.log(`${credential.email}\t${credential.password}`);
  await mongoose.disconnect();
}

bootstrapPasswords().catch(async (error: unknown) => {
  console.error('Credential bootstrap failed:', error instanceof Error ? error.message : 'Unknown error');
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});