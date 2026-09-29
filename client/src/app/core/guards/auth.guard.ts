import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserStateService } from '../services/user-state.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const userState = inject(UserStateService);
  const router = inject(Router);
  return userState.restoreSession().pipe(map((user) => {
    if (!user) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    if (user.mustChangePassword && state.url !== '/change-password') return router.parseUrl('/change-password');
    return true;
  }));
};

export const adminGuard: CanActivateFn = () => {
  const userState = inject(UserStateService);
  const router = inject(Router);
  return userState.restoreSession().pipe(map((user) =>
    user && (user.role === 'manager' || user.role === 'hr') ? true : router.parseUrl('/dashboard'),
  ));
};

export const loginGuard: CanActivateFn = () => {
  const userState = inject(UserStateService);
  const router = inject(Router);
  return userState.restoreSession().pipe(map((user) => {
    if (!user) return true;
    return router.parseUrl(user.mustChangePassword ? '/change-password' : '/dashboard');
  }));
};