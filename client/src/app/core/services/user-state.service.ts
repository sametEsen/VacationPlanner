import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models';

/**
 * Holds the currently selected user across the entire app.
 * No authentication — user is simply selected from a dropdown.
 */
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAdmin = computed(() => {
    const u = this._currentUser();
    return u?.role === 'manager' || u?.role === 'hr';
  });
  readonly isManager = computed(() => {
    const u = this._currentUser();
    return u?.role === 'manager' || u?.role === 'hr';
  });

  setUser(user: User): void {
    this._currentUser.set(user);
  }

  clearUser(): void {
    this._currentUser.set(null);
  }
}
