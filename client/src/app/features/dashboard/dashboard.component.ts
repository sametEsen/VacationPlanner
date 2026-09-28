import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { EuDatePipe } from '../../shared/eu-date.pipe';
import { ApiService } from '../../core/services/api.service';
import { UserStateService } from '../../core/services/user-state.service';
import { UserBalance, HolidayRequest } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatChipsModule,
    MatIconModule,
    MatDividerModule,
    EuDatePipe,
  ],
  template: `
    <div class="dashboard">
      @if (!userState.currentUser()) {
        <div class="requests-section">
          <p style="color:var(--text-muted)">Please select a user from the top bar.</p>
        </div>
      } @else {
        <h2 class="page-title">
          <mat-icon>dashboard</mat-icon>
          Dashboard — {{ userState.currentUser()?.name }}
        </h2>

        @if (balance()) {
          <div class="balance-grid">
            <div class="balance-card total">
              <div class="balance-value">{{ balance()!.totalHolidayDays }}</div>
              <div class="balance-label">Total Days</div>
            </div>
            <div class="balance-card used">
              <div class="balance-value">{{ balance()!.usedDaysCurrentYear }}</div>
              @if (balance()!.usedDaysOutsideCurrentYear > 0) {
                <div class="balance-detail">({{ balance()!.usedDays }} - {{ balance()!.usedDaysOutsideCurrentYear }} [from next year])</div>
              }
              <div class="balance-label">Used Days</div>
            </div>
            <div class="balance-card remaining">
              <div class="balance-value">{{ balance()!.remainingDays }}</div>
              <div class="balance-label">Remaining Days</div>
            </div>
          </div>

          <div class="progress-card">
            <div class="progress-label">
              Holiday usage: {{ balance()!.usedDaysCurrentYear }} / {{ balance()!.totalHolidayDays }} days
            </div>
            <mat-progress-bar
              mode="determinate"
              [value]="usagePercent()"
              [color]="usagePercent() > 80 ? 'warn' : 'primary'"
            />
            <div class="progress-pct">{{ usagePercent() | number:'1.0-0' }}%</div>
          </div>
        }

        <div class="requests-section">
          <div class="section-title">
            <mat-icon>list_alt</mat-icon> Recent Requests
          </div>
          @if (requests().length === 0) {
            <p class="empty-state">No vacation requests yet.</p>
          } @else {
            @for (req of requests(); track req.id) {
              <div class="request-row">
                <div class="request-dates">
                  <mat-icon class="date-icon">date_range</mat-icon>
                  {{ req.startDate | euDate }} → {{ req.endDate | euDate }}
                  <span class="workdays">({{ req.workdaysCount }} workdays)</span>
                </div>
                <span class="chip status-{{ req.status }}">{{ req.status | titlecase }}</span>
              </div>
              <mat-divider style="border-color:var(--border)" />
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { max-width: 960px; }

    .balance-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .balance-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: border-color 0.2s, transform 0.2s;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--grad-subtle);
        opacity: 0;
        transition: opacity 0.2s;
      }
      &:hover { transform: translateY(-2px); border-color: rgba(139,92,246,0.3); }
      &:hover::before { opacity: 1; }
    }

    .balance-card.total  { --accent: var(--blue);    border-top: 2px solid var(--blue); }
    .balance-card.used   { --accent: var(--amber);   border-top: 2px solid var(--amber); }
    .balance-card.remaining { --accent: var(--emerald); border-top: 2px solid var(--emerald); }

    .balance-value {
      font-size: 2.8rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1;
      margin-bottom: 6px;
    }
    .balance-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
    .balance-detail {
      font-size: 0.88rem;
      color: var(--text-faint);
      margin-bottom: 6px;
      font-variant-numeric: tabular-nums;
    }

    .progress-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
      margin-bottom: 20px;
    }
    .progress-label { margin-bottom: 10px; font-size: 0.85rem; color: var(--text-muted); }
    .progress-pct { text-align: right; font-size: 0.8rem; color: var(--text-faint); margin-top: 6px; }

    :host ::ng-deep .mat-mdc-progress-bar .mdc-linear-progress__bar-inner {
      background: var(--grad) !important;
      border-color: var(--grad) !important;
    }
    :host ::ng-deep .mat-mdc-progress-bar .mdc-linear-progress__track {
      background: rgba(255,255,255,0.06) !important;
    }

    .requests-section {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 16px;
      mat-icon { color: var(--violet); font-size: 20px; }
    }

    .request-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
    }
    .request-dates { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: var(--text); }
    .date-icon { font-size: 16px; color: var(--text-faint); }
    .workdays { color: var(--text-faint); font-size: 0.78rem; }
    .empty-state { color: var(--text-muted); padding: 12px 0; font-size: 0.9rem; }

    .chip { padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .status-pending  { background: rgba(245,158,11,0.15);  color: var(--amber); }
    .status-approved { background: rgba(16,185,129,0.15);  color: var(--emerald); }
    .status-rejected { background: rgba(239,68,68,0.15);   color: var(--red); }
  `],
})
export class DashboardComponent implements OnInit {
  userState = inject(UserStateService);
  private api = inject(ApiService);

  balance = signal<UserBalance | null>(null);
  requests = signal<HolidayRequest[]>([]);

  usagePercent = computed(() => {
    const b = this.balance();
    if (!b || b.totalHolidayDays === 0) return 0;
    return Math.min((b.usedDaysCurrentYear / b.totalHolidayDays) * 100, 100);
  });

  constructor() {
    effect(() => {
      const user = this.userState.currentUser();
      if (!user) {
        this.balance.set(null);
        this.requests.set([]);
        return;
      }
      this.loadData(user.id);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Data loading is handled reactively via signal effect in constructor.
  }

  private loadData(userId: string): void {
    this.api.getUserBalance(userId).subscribe((b) => this.balance.set(b));
    this.api.getUserRequests(userId).subscribe((reqs) => this.requests.set(reqs.slice(0, 5)));
  }
}
