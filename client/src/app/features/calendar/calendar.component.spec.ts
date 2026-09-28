import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { UserStateService } from '../../core/services/user-state.service';
import { CalendarComponent } from './calendar.component';

describe('CalendarComponent mobile range', () => {
  const openDialog = vi.fn(() => ({ afterClosed: () => of(null) }));

  beforeEach(() => {
    openDialog.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: UserStateService, useValue: { currentUser: signal({ id: 'user-1' }) } },
        { provide: ApiService, useValue: {} },
        { provide: MatDialog, useValue: { open: openDialog } },
        { provide: MatSnackBar, useValue: {} },
      ],
    });
  });

  it('keeps the entered end date inclusive when opening confirmation', () => {
    const calendar = TestBed.runInInjectionContext(() => new CalendarComponent());
    calendar.mobileStartDate = '2026-09-28';
    calendar.mobileEndDate = '2026-09-30';

    calendar.submitMobileRange();

    expect(openDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ startDate: '2026-09-28', endDate: '2026-09-30', workdaysCount: 3 }),
    }));
  });

  it('does not open confirmation for a reversed date range', () => {
    const calendar = TestBed.runInInjectionContext(() => new CalendarComponent());
    calendar.mobileStartDate = '2026-09-30';
    calendar.mobileEndDate = '2026-09-28';

    calendar.submitMobileRange();

    expect(openDialog).not.toHaveBeenCalled();
  });
});