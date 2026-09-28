import {
  Component,
  OnInit,
  inject,
  signal,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ApiService } from '../../core/services/api.service';
import { UserStateService } from '../../core/services/user-state.service';
import { HolidayRequest, PublicHoliday, CompanyHoliday, UserBalance } from '../../core/models';
import {
  RequestDialogComponent,
  RequestDialogData,
  RequestDialogResult,
} from './request-dialog.component';

@Component({
  selector: 'app-calendar',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    FullCalendarModule,
  ],
  template: `
    <div class="calendar-page">
      <h2 class="page-title">
        <mat-icon>calendar_month</mat-icon>
        Request Vacation — {{ userState.currentUser()?.name ?? 'No user selected' }}
      </h2>

      @if (!userState.currentUser()) {
        <mat-card>
          <mat-card-content>Please select a user from the top bar.</mat-card-content>
        </mat-card>
      } @else if (loading()) {
        <div class="spinner-wrap">
          <mat-spinner diameter="40" />
        </div>
      } @else if (isBrowser) {
        <mat-card class="hint-card">
          <mat-card-content>
            <mat-icon>info</mat-icon>
            Click and drag on the calendar to select your vacation dates. Weekends and holidays are highlighted.
            <strong>Balance: {{ balance()?.remainingDays ?? '—' }} days remaining.</strong>
          </mat-card-content>
        </mat-card>

        <mat-card class="fc-card">
          <mat-card-content>
            <full-calendar [options]="calendarOptions()" />
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .calendar-page { max-width: 1050px; }

    /* ── Hint banner ──────────────────────────────────────────── */
    .hint-card {
      background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.08)) !important;
      border: 1px solid rgba(139,92,246,0.25) !important;
      border-radius: var(--radius) !important;
      margin-bottom: 16px;
    }
    .hint-card mat-card-content { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: var(--text-muted); }
    .hint-card mat-icon { color: var(--violet); font-size: 18px; }
    .hint-card strong { color: var(--cyan); }

    /* ── Spinner ──────────────────────────────────────────────── */
    .spinner-wrap { display: flex; justify-content: center; padding: 60px; }

    /* ── Calendar wrapper ─────────────────────────────────────── */
    .fc-card {
      background: #3a3d4a !important;
      border: 1px solid #2d3145 !important;
      border-radius: var(--radius) !important;
      overflow: hidden;
    }
    .fc-card mat-card-content { padding: 0 !important; }

    /* ══ FullCalendar native CSS variables ═══════════════════════
       These are the official way to theme FC — no deep overrides needed */
    :host ::ng-deep .fc {
      --fc-page-bg-color:              #3a3d4a;
      --fc-neutral-bg-color:           #44475a;
      --fc-neutral-text-color:         #e2e4f0;
      --fc-border-color:               #2d3145;
      --fc-button-bg-color:            #2a2e42;
      --fc-button-border-color:        #3a3f58;
      --fc-button-text-color:          #c5cae9;
      --fc-button-hover-bg-color:      #363c58;
      --fc-button-hover-border-color:  #7c6fd0;
      --fc-button-active-bg-color:     #4a3f8c;
      --fc-button-active-border-color: #8b5cf6;
      --fc-event-bg-color:             #4a3f8c;
      --fc-event-border-color:         transparent;
      --fc-event-text-color:           #e2e4f0;
      --fc-event-selected-overlay-color: rgba(139,92,246,0.25);
      --fc-today-bg-color:             rgba(99,102,241,0.15);
      --fc-highlight-color:            rgba(99,102,241,0.2);
      --fc-now-indicator-color:        #f43f5e;
      --fc-list-event-hover-bg-color:  rgba(99,102,241,0.1);
      --fc-small-font-size:            0.8em;
      font-family: Roboto, sans-serif;
    }

    /* Text color for day numbers & col headers */
    :host ::ng-deep .fc .fc-col-header-cell-cushion,
    :host ::ng-deep .fc .fc-daygrid-day-number {
      color: #e2e4f0 !important;
      text-decoration: none !important;
      font-size: 0.8rem;
    }
    :host ::ng-deep .fc .fc-col-header-cell-cushion {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-size: 0.7rem;
      padding: 10px 0;
    }

    /* Today — readable highlight */
    :host ::ng-deep .fc .fc-day-today .fc-daygrid-day-number {
      background: #6366f1;
      color: #fff !important;
      border-radius: 50%;
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      margin: 4px 6px;
      padding: 0;
      font-weight: 700;
    }

    /* Weekends — subtle tint only */
    :host ::ng-deep .fc .fc-day-sat,
    :host ::ng-deep .fc .fc-day-sun {
      background: rgba(0,0,0,0.15) !important;
    }

    /* Toolbar title */
    :host ::ng-deep .fc .fc-toolbar-title {
      color: #e2e4f0;
      font-size: 1rem;
      font-weight: 600;
    }

    /* Button group border radius */
    :host ::ng-deep .fc .fc-button {
      border-radius: 8px !important;
      font-size: 0.82rem !important;
      font-weight: 500 !important;
      box-shadow: none !important;
      padding: 5px 14px !important;
    }
    :host ::ng-deep .fc .fc-button-group .fc-button:not(:first-child) { border-radius: 0 8px 8px 0 !important; }
    :host ::ng-deep .fc .fc-button-group .fc-button:not(:last-child)  { border-radius: 8px 0 0 8px !important; }

    /* Events */
    :host ::ng-deep .fc .fc-event {
      border-radius: 6px !important;
      font-size: 0.76rem !important;
      font-weight: 500 !important;
      padding: 1px 5px !important;
      transition: filter 0.15s;
    }
    :host ::ng-deep .fc .fc-event:hover { filter: brightness(1.15); }
    :host ::ng-deep .fc .fc-event-title { color: #e2e4f0 !important; }

    /* Background (holiday) events — visible but not overpowering */
    :host ::ng-deep .fc .fc-bg-event { opacity: 0.35 !important; }

    /* Cell min height */
    :host ::ng-deep .fc .fc-daygrid-day-frame { min-height: 88px; }

    /* Popover */
    :host ::ng-deep .fc .fc-popover {
      background: #242739 !important;
      border: 1px solid #3a3f58 !important;
      border-radius: 10px !important;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5) !important;
    }
    :host ::ng-deep .fc .fc-popover-header { background: rgba(139,92,246,0.2) !important; color: #e2e4f0 !important; }
    :host ::ng-deep .fc .fc-popover-body { background: #242739 !important; }
  `],
})
export class CalendarComponent implements OnInit {
  userState = inject(UserStateService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  isBrowser = isPlatformBrowser(this.platformId);
  loading = signal(true);
  balance = signal<UserBalance | null>(null);
  private allHolidays: Array<{ date: string; name: string }> = [];
  calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    selectable: true,
    selectMirror: true,
    weekends: true,
    firstDay: 1, // Monday first (NL standard)
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth',
    },
    events: [],
    select: (info) => this.onDateSelect(info.startStr, info.endStr),
  });

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;

      const user = this.userState.currentUser();
      if (!user) {
        this.loading.set(false);
        this.balance.set(null);
        this.calendarOptions.update((opts) => ({ ...opts, events: [] }));
        return;
      }

      this.loading.set(true);
      this.loadCalendarData(user.id);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Data loading is handled reactively via signal effect in constructor.
  }

  private loadCalendarData(userId: string): void {
    const year = new Date().getFullYear();
    const nextYear = year + 1;

    Promise.all([
      this.api.getUserRequests(userId).toPromise(),
      this.api.getPublicHolidays(year).toPromise(),
      this.api.getCompanyHolidays(year).toPromise(),
      this.api.getUserBalance(userId).toPromise(),
      this.api.getPublicHolidays(nextYear).toPromise(),
      this.api.getCompanyHolidays(nextYear).toPromise(),
    ]).then(([requests, pubHols, compHols, bal, pubHolsNext, compHolsNext]) => {
      this.balance.set(bal ?? null);

      const allPubHols = [...(pubHols ?? []), ...(pubHolsNext ?? [])];
      const allCompHols = [...(compHols ?? []), ...(compHolsNext ?? [])];

      // Build holiday lookup used by estimateWorkdays
      this.allHolidays = [
        ...allPubHols.map((h: PublicHoliday) => ({ date: h.date, name: h.localName })),
        ...allCompHols.map((h: CompanyHoliday) => ({ date: h.date, name: h.name })),
      ];

      const events: EventInput[] = [];

      // User's vacation requests
      (requests ?? []).forEach((r: HolidayRequest) => {
        const endPlusOne = this.addDays(r.endDate, 1);
        events.push({
          id: `req-${r.id}`,
          title: `${r.workdaysCount}d — ${r.status}`,
          start: r.startDate,
          end: endPlusOne,
          color: r.status === 'approved' ? '#388e3c' : r.status === 'rejected' ? '#c62828' : '#1976d2',
          textColor: '#e2e4f0',
          extendedProps: { type: 'request', status: r.status },
        });
      });

      // NL public holidays (current + next year)
      allPubHols.forEach((h: PublicHoliday) => {
        events.push({
          id: `pub-${h.date}`,
          title: `🇳🇱 ${h.localName}`,
          start: h.date,
          allDay: true,
          color: '#ff7043',
          display: 'background',
        });
      });

      // Company holidays (current + next year)
      allCompHols.forEach((h: CompanyHoliday) => {
        events.push({
          id: `comp-${h.id}`,
          title: `🏢 ${h.name}`,
          start: h.date,
          allDay: true,
          color: '#8e24aa',
          display: 'background',
        });
      });

      this.calendarOptions.update((opts) => ({ ...opts, events }));
      this.loading.set(false);
    });
  }

  private onDateSelect(startStr: string, endStr: string): void {
    const user = this.userState.currentUser();
    if (!user) return;

    // FullCalendar end is exclusive — convert to last-day-inclusive
    const endInclusive = this.addDays(endStr, -1);

    const { count: workdays, excludedHolidays, byYear } = this.estimateWorkdays(startStr, endInclusive);
    const bal = this.balance();
    const balanceYear = bal?.currentYear ?? new Date().getFullYear();

    const data: RequestDialogData = {
      startDate: startStr,
      endDate: endInclusive,
      workdaysCount: workdays,
      balanceYear,
      balanceYearWorkdays: byYear[balanceYear] ?? 0,
      remainingDays: bal?.remainingDays ?? 0,
      yearlyWorkdays: Object.entries(byYear)
        .map(([year, days]) => ({ year: Number(year), days }))
        .sort((a, b) => a.year - b.year),
      excludedHolidays,
    };

    const dialogRef = this.dialog.open(RequestDialogComponent, {
      width: '460px',
      data,
    });

    dialogRef.afterClosed().subscribe((result: RequestDialogResult) => {
      if (!result?.confirmed) return;
      this.api
        .submitRequest({ userId: user.id, startDate: startStr, endDate: endInclusive, reason: result.reason })
        .subscribe({
          next: () => {
            this.snackBar.open('Vacation request submitted! The manager has been notified.', 'OK', { duration: 4000 });
            this.loadCalendarData(user.id);
          },
          error: (err) => {
            const msg = err?.error?.error || 'Failed to submit request.';
            this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
          },
        });
    });
  }

  /** Count workdays between two dates, excluding weekends and all loaded holidays. */
  private estimateWorkdays(start: string, end: string): { count: number; excludedHolidays: Array<{ date: string; name: string }>; byYear: Record<number, number> } {
    const s = new Date(start);
    const e = new Date(end);
    const holidayMap = new Map(this.allHolidays.map(h => [h.date, h.name]));
    const excludedHolidays: Array<{ date: string; name: string }> = [];
    const byYear: Record<number, number> = {};
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay();
      const dateStr = this.toISODate(cur);
      if (day !== 0 && day !== 6) {
        if (holidayMap.has(dateStr)) {
          excludedHolidays.push({ date: dateStr, name: holidayMap.get(dateStr)! });
        } else {
          count++;
          const year = cur.getFullYear();
          byYear[year] = (byYear[year] ?? 0) + 1;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return { count, excludedHolidays, byYear };
  }

  private toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}
