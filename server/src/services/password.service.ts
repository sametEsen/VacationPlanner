import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) return reject(error);
      return resolve(key);
    });
  });
}

export function createTemporaryPassword(): string {
  return randomBytes(18).toString('base64url');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, storedKey] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !storedKey || !/^[0-9a-f]+$/i.test(storedKey)) return false;

  const expected = Buffer.from(storedKey, 'hex');
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}