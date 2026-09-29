import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { User } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserStateService {
  private api = inject(ApiService);
  private _currentUser = signal<User | null>(null);
  private sessionReady = signal(false);
  private restoreRequest?: Observable<User | null>;

  readonly currentUser = this._currentUser.asReadonly();
  readonly initialized = this.sessionReady.asReadonly();
  readonly isAdmin = computed(() => {
    const u = this._currentUser();
    return u?.role === 'manager' || u?.role === 'hr';
  });
  readonly isManager = computed(() => {
    const u = this._currentUser();
    return u?.role === 'manager' || u?.role === 'hr';
  });

  setAuthenticatedUser(user: User): void {
    this._currentUser.set(user);
    this.sessionReady.set(true);
    this.restoreRequest = undefined;
  }

  restoreSession(): Observable<User | null> {
    if (this.sessionReady()) return of(this._currentUser());
    if (!this.restoreRequest) {
      this.restoreRequest = this.api.getCurrentUser().pipe(
        tap((user) => this.setAuthenticatedUser(user)),
        map((user) => user),
        catchError(() => {
          this.clearLocalSession();
          return of(null);
        }),
        shareReplay(1),
      );
    }
    return this.restoreRequest;
  }

  logout(): Observable<void> {
    return this.api.logout().pipe(tap(() => this.clearLocalSession()));
  }

  private clearLocalSession(): void {
    this._currentUser.set(null);
    this.sessionReady.set(true);
    this.restoreRequest = undefined;
  }
}
