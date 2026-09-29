import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';
import { User } from '../entities/User';
import { requireAuthenticatedUser, requiresPasswordChange } from '../middleware/auth.middleware';
import { hashPassword, verifyPassword } from '../services/password.service';

const router = Router();
let fallbackHashPromise: Promise<string> | undefined;
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again later.' },
});

function toAuthUser(user: NonNullable<Request['authUser']>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    totalHolidayDays: user.totalHolidayDays,
    mustChangePassword: requiresPasswordChange(user),
  };
}

function getFallbackHash(): Promise<string> {
  fallbackHashPromise ??= hashPassword(randomBytes(32).toString('base64url'));
  return fallbackHashPromise;
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

function destroySession(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      res.clearCookie('vacation.sid', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
      if (error) return reject(error);
      return resolve();
    });
  });
}

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password || password.length > 128) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }

  try {
    const user = await User.findOne({ email }).select('+passwordHash +authVersion');
    const passwordHash = user?.passwordHash ?? await getFallbackHash();
    if (!(await verifyPassword(password, passwordHash)) || !user?.passwordHash) {
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }

    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.authVersion = user.authVersion;
    await saveSession(req);
    return res.json({ user: toAuthUser(user) });
  } catch {
    return res.status(500).json({ error: 'Unable to sign in right now' });
  }
});

router.get('/me', requireAuthenticatedUser, (req: Request, res: Response) => {
  return res.json({ user: toAuthUser(req.authUser!) });
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    await destroySession(req, res);
    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: 'Unable to sign out right now' });
  }
});

router.post('/change-password', requireAuthenticatedUser, async (req: Request, res: Response) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (newPassword.length < 12 || newPassword.length > 128) {
    return res.status(400).json({ error: 'New password must be between 12 and 128 characters' });
  }

  try {
    const user = await User.findById(req.authUser!.id).select('+passwordHash +authVersion');
    if (!user?.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    if (await verifyPassword(newPassword, user.passwordHash)) {
      return res.status(400).json({ error: 'Choose a password different from your current password' });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    user.authVersion += 1;
    await user.save();
    await destroySession(req, res);
    return res.json({ success: true, loginRequired: true });
  } catch {
    return res.status(500).json({ error: 'Unable to change password right now' });
  }
});

export default router;