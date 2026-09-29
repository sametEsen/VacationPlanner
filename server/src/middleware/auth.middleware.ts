import { NextFunction, Request, Response } from 'express';
import { IUser, UserRole } from '../entities/User';
import { User } from '../entities/User';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    authVersion?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      authUser?: IUser;
    }
  }
}

export function attachAuthenticatedUser(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.session.userId;
  if (!userId) return next();

  User.findById(userId)
    .select('name email role totalHolidayDays mustChangePassword authVersion')
    .then((user) => {
      if (!user || user.authVersion !== req.session.authVersion) {
        req.session.destroy(() => undefined);
        return next();
      }
      req.authUser = user;
      return next();
    })
    .catch(next);
}

export function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function requiresPasswordChange(user: Pick<IUser, 'mustChangePassword'>): boolean {
  return process.env.ENFORCE_TEMP_PASSWORD_CHANGE === 'true' && user.mustChangePassword;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (requiresPasswordChange(req.authUser)) {
    res.status(403).json({ error: 'Change your temporary password before continuing', code: 'PASSWORD_CHANGE_REQUIRED' });
    return;
  }
  next();
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (requiresPasswordChange(req.authUser)) {
      res.status(403).json({ error: 'Change your temporary password before continuing', code: 'PASSWORD_CHANGE_REQUIRED' });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.get('origin');
  const allowedOrigins = (process.env.APP_ORIGINS ?? 'http://localhost:4200,http://127.0.0.1:4200,http://localhost:4000,http://127.0.0.1:4000,http://localhost:1919,http://127.0.0.1:1919')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origin || !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: 'Request origin is not allowed' });
    return;
  }
  next();
}