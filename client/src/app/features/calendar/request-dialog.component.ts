import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { EuDatePipe } from '../../shared/eu-date.pipe';

export interface RequestDialogData {
  startDate: string;
  endDate: string;
  workdaysCount: number;
  balanceYear: number;
  balanceYearWorkdays: number;
  remainingDays: number;
  yearlyWorkdays: Array<{ year: number; days: number }>;
  excludedHolidays: Array<{ date: string; name: string }>;
}

export interface RequestDialogResult {
  confirmed: boolean;
  reason: string;
}

@Component({
  selector: 'app-request-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    EuDatePipe,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>beach_access</mat-icon> Confirm Vacation Request
    </h2>
    <mat-dialog-content>
      <div class="summary">
        <div class="row">
          <mat-icon>date_range</mat-icon>
          <span><strong>{{ data.startDate | euDate }}</strong> → <strong>{{ data.endDate | euDate }}</strong></span>
        </div>
        <div class="row">
          <mat-icon>work_off</mat-icon>
          <span><strong>{{ data.workdaysCount }}</strong> working days</span>
        </div>
        @if (data.yearlyWorkdays.length > 1) {
          <div class="row">
            <mat-icon>splitscreen</mat-icon>
            <span>
              Split:
              @for (entry of data.yearlyWorkdays; track entry.year; let last = $last) {
                <strong>{{ entry.year }}: {{ entry.days }}</strong>@if (!last) {, }
              }
            </span>
          </div>
        }
        @if (data.excludedHolidays.length > 0) {
          <div class="row holidays-excluded">
            <mat-icon>event_busy</mat-icon>
            <div>
              <span>Excluded public holidays:</span>
              <ul>
                @for (h of data.excludedHolidays; track h.date) {
                  <li>{{ h.date | euDate }} — {{ h.name }}</li>
                }
              </ul>
            </div>
          </div>
        }
        <div class="row" [class.over-limit]="data.balanceYearWorkdays > data.remainingDays">
          <mat-icon>account_balance</mat-icon>
          <span>Balance remaining after {{ data.balanceYear }}: <strong>{{ data.remainingDays - data.balanceYearWorkdays }}</strong> days</span>
        </div>
        @if (data.balanceYearWorkdays > data.remainingDays) {
          <p class="error">⚠️ You don't have enough holiday balance for {{ data.balanceYear }} for this request.</p>
        }
      </div>
      <mat-form-field appearance="outline" class="reason-field">
        <mat-label>Reason (optional)</mat-label>
        <input matInput [(ngModel)]="reason" placeholder="Family trip, personal, etc." />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
          [disabled]="data.balanceYearWorkdays > data.remainingDays"
        (click)="confirm()"
      >
        Submit Request
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; color: var(--text); }
    h2 mat-icon { color: var(--violet); }
    .summary {
      background: rgba(139,92,246,0.07);
      border: 1px solid rgba(139,92,246,0.2);
      border-radius: var(--radius-sm);
      padding: 16px;
      margin-bottom: 16px;
    }
    .row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--text-muted); font-size: 0.9rem; }
    .row mat-icon { color: var(--text-faint); font-size: 18px; }
    .row strong { color: var(--text); }
    .holidays-excluded { align-items: flex-start; }
    .holidays-excluded mat-icon { margin-top: 2px; }
    .holidays-excluded ul { margin: 4px 0 0 0; padding-left: 16px; font-size: 0.82rem; color: var(--text-muted); }
    .holidays-excluded li { margin-bottom: 2px; }
    .over-limit strong { color: var(--red); }
    .error { color: var(--red); font-size: 0.83rem; margin-top: 4px; }
    .reason-field { width: 100%; }
    mat-dialog-actions { flex-wrap: wrap; }
    @media (max-width: 600px) {
      h2 { font-size: 1.15rem; line-height: 1.3; }
      .summary { padding: 12px; }
      .row { align-items: flex-start; overflow-wrap: anywhere; }
      .row mat-icon { flex-shrink: 0; }
    }
  `],
})
export class RequestDialogComponent {
  dialogRef = inject(MatDialogRef<RequestDialogComponent>);
  data: RequestDialogData = inject(MAT_DIALOG_DATA);
  reason = '';

  confirm(): void {
    this.dialogRef.close({ confirmed: true, reason: this.reason } as RequestDialogResult);
  }

  cancel(): void {
    this.dialogRef.close({ confirmed: false, reason: '' } as RequestDialogResult);
  }
}
