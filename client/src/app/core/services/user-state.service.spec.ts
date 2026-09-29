import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { UserStateService } from './user-state.service';

describe('UserStateService', () => {
  const user = { id: 'u1', name: 'Samet', email: 'samet@example.com', role: 'employee' as const, totalHolidayDays: 25 };
  let api: { getCurrentUser: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = {
      getCurrentUser: vi.fn(() => of(user)),
      logout: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({ providers: [UserStateService, { provide: ApiService, useValue: api }] });
  });

  it('restores the current session once', async () => {
    const state = TestBed.inject(UserStateService);
    await new Promise<void>((resolve) => state.restoreSession().subscribe(() => resolve()));
    await new Promise<void>((resolve) => state.restoreSession().subscribe(() => resolve()));

    expect(state.currentUser()).toEqual(user);
    expect(api.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('logs out through the API and clears local identity', async () => {
    const state = TestBed.inject(UserStateService);
    state.setAuthenticatedUser(user);
    await new Promise<void>((resolve) => state.logout().subscribe(() => resolve()));

    expect(api.logout).toHaveBeenCalledOnce();
    expect(state.currentUser()).toBeNull();
  });
});