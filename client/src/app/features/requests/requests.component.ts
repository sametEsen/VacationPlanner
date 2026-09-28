import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EuDatePipe } from '../../shared/eu-date.pipe';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { UserStateService } from '../../core/services/user-state.service';
import { HolidayRequest, HREmailDraft } from '../../core/models';
import { HREmailDialogComponent } from './hr-email-dialog.component';

@Component({
  selector: 'app-requests',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatTooltipModule,
    EuDatePipe,
  ],
  template: `
    <div class="requests-page">
      <h2 class="page-title">
        <mat-icon>list_alt</mat-icon> Vacation Requests
      </h2>

      <mat-tab-group [selectedIndex]="userState.isManager() ? 1 : 0">
        <!-- My Requests Tab -->
        <mat-tab label="My Requests">
          <div class="tab-content">
            @if (myRequests().length === 0) {
              <p class="empty">You have no vacation requests yet.</p>
            } @else {
              @for (req of myRequests(); track req.id) {
                <mat-card class="req-card">
                  <mat-card-content>
                    <div class="req-header">
                      <div class="req-dates">
                        @if (editingId() === req.id) {
                          <mat-form-field appearance="outline" class="date-field">
                            <mat-label>Start</mat-label>
                            <input matInput type="date" [(ngModel)]="editDraft.startDate" />
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="date-field">
                            <mat-label>End</mat-label>
                            <input matInput type="date" [(ngModel)]="editDraft.endDate" />
                          </mat-form-field>
                        } @else {
                          <mat-icon>date_range</mat-icon>
                          <strong>{{ req.startDate | euDate }}</strong> → <strong>{{ req.endDate | euDate }}</strong>
                          <span class="workdays">({{ req.workdaysCount }} workdays)</span>
                        }
                      </div>
                      <mat-chip [class]="'chip-' + req.status">{{ req.status | titlecase }}</mat-chip>
                    </div>
                    @if (editingId() === req.id) {
                      <mat-form-field appearance="outline" class="reason-field">
                        <mat-label>Reason (optional)</mat-label>
                        <input matInput [(ngModel)]="editDraft.reason" />
                      </mat-form-field>
                    } @else if (req.reason) {
                      <p class="reason">{{ req.reason }}</p>
                    }
                    @if (editingId() === req.id) {
                      <div class="actions">
                        <button
                          mat-raised-button
                          color="primary"
                          [disabled]="!editDraft.startDate || !editDraft.endDate"
                          (click)="saveEdit(req)"
                        >
                          <mat-icon>save</mat-icon> Save
                        </button>
                        <button mat-stroked-button (click)="cancelEdit()">
                          <mat-icon>close</mat-icon> Cancel
                        </button>
                      </div>
                    } @else if (req.status !== 'rejected') {
                      <div class="actions">
                        <button mat-stroked-button (click)="startEdit(req)">
                          <mat-icon>edit</mat-icon> Edit
                        </button>
                        <button mat-stroked-button color="warn" (click)="deleteRequest(req)">
                          <mat-icon>delete</mat-icon> Delete
                        </button>
                      </div>
                    } @else {
                      <div class="actions">
                        <button mat-stroked-button color="warn" (click)="deleteRequest(req)">
                          <mat-icon>delete</mat-icon> Delete
                        </button>
                      </div>
                    }
                    @if (req.status === 'approved' && editingId() !== req.id) {
                      <div class="actions">
                        <button mat-stroked-button color="primary" (click)="openHREmail(req)">
                          <mat-icon>email</mat-icon> Notify HR
                        </button>
                      </div>
                    }
                  </mat-card-content>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <!-- All Requests Tab (Manager/HR only) -->
        @if (userState.isManager()) {
          <mat-tab label="All Requests (Manager View)">
            <div class="tab-content">
              @if (allRequests().length === 0) {
                <p class="empty">No requests in the system.</p>
              } @else {
                @for (req of allRequests(); track req.id) {
                  <mat-card class="req-card">
                    <mat-card-content>
                      <div class="req-header">
                        <div class="req-info">
                          <strong>{{ req.user.name }}</strong>
                          <span class="email">{{ req.user.email }}</span>
                        </div>
                        <mat-chip [class]="'chip-' + req.status">{{ req.status | titlecase }}</mat-chip>
                      </div>
                      <div class="req-dates">
                        <mat-icon>date_range</mat-icon>
                        {{ req.startDate | euDate }} → {{ req.endDate | euDate }}
                        <span class="workdays">({{ req.workdaysCount }} workdays)</span>
                      </div>
                      @if (req.reason) {
                        <p class="reason">{{ req.reason }}</p>
                      }
                      @if (req.status === 'pending') {
                        <div class="actions">
                          <button mat-raised-button color="primary" (click)="approveRequest(req)">
                            <mat-icon>check</mat-icon> Approve
                          </button>
                          <button mat-stroked-button color="warn" (click)="rejectRequest(req)">
                            <mat-icon>close</mat-icon> Reject
                          </button>
                        </div>
                      }
                    </mat-card-content>
                  </mat-card>
                }
              }
            </div>
          </mat-tab>
        }
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .requests-page { max-width: 820px; }

    :host ::ng-deep .mat-mdc-tab-body-wrapper { padding-top: 16px; }
    :host ::ng-deep .mat-mdc-tab-labels { gap: 4px; }

    .req-card {
      background: var(--bg-surface) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius) !important;
      margin-bottom: 12px !important;
      transition: border-color 0.2s, transform 0.2s;
      &:hover { border-color: rgba(139,92,246,0.3) !important; transform: translateY(-1px); }
    }

    .req-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .req-info { display: flex; flex-direction: column; gap: 2px; }
    .req-info strong { color: var(--text); font-size: 0.95rem; }
    .email { font-size: 0.78rem; color: var(--text-faint); }
    .req-dates { display: flex; align-items: center; gap: 6px; font-size: 0.88rem; color: var(--text-muted); }
    .req-dates mat-icon { font-size: 16px; color: var(--text-faint); }
    .date-field { width: 160px; }
    .reason-field { width: 100%; margin-top: 8px; }
    .workdays { color: var(--text-faint); font-size: 0.78rem; }
    .reason { color: var(--text-muted); font-size: 0.82rem; font-style: italic; margin: 6px 0 0; }
    .actions { display: flex; gap: 8px; margin-top: 12px; }
    .empty { color: var(--text-muted); padding: 20px 0; font-size: 0.9rem; }

    .chip { padding: 3px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .chip-pending  { background: rgba(245,158,11,0.15);  color: var(--amber); }
    .chip-approved { background: rgba(16,185,129,0.15);  color: var(--emerald); }
    .chip-rejected { background: rgba(239,68,68,0.15);   color: var(--red); }
  `],
})
export class RequestsComponent implements OnInit {
  userState = inject(UserStateService);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  myRequests = signal<HolidayRequest[]>([]);
  allRequests = signal<HolidayRequest[]>([]);
  editingId = signal<string | null>(null);
  editDraft = { startDate: '', endDate: '', reason: '' };

  constructor() {
    effect(() => {
      const user = this.userState.currentUser();
      if (!user) {
        this.myRequests.set([]);
        this.allRequests.set([]);
        this.cancelEdit();
        return;
      }
      this.loadRequests();
    });
  }

  ngOnInit(): void {
    // Data loading is handled reactively via signal effect in constructor.
  }

  loadRequests(): void {
    const user = this.userState.currentUser();
    if (!user) return;

    this.api.getUserRequests(user.id).subscribe((r) => this.myRequests.set(r));

    if (this.userState.isManager()) {
      this.api.getAllRequests().subscribe((r) => this.allRequests.set(r));
    }
  }

  approveRequest(req: HolidayRequest): void {
    this.api.approveRequest(req.id).subscribe({
      next: () => {
        this.snackBar.open('Request approved!', 'OK', { duration: 3000 });
        this.loadRequests();
      },
      error: () => this.snackBar.open('Failed to approve request.', 'Dismiss', { duration: 3000 }),
    });
  }

  rejectRequest(req: HolidayRequest): void {
    this.api.rejectRequest(req.id).subscribe({
      next: () => {
        this.snackBar.open('Request rejected.', 'OK', { duration: 3000 });
        this.loadRequests();
      },
      error: () => this.snackBar.open('Failed to reject request.', 'Dismiss', { duration: 3000 }),
    });
  }

  startEdit(req: HolidayRequest): void {
    this.editingId.set(req.id);
    this.editDraft = {
      startDate: req.startDate,
      endDate: req.endDate,
      reason: req.reason || '',
    };
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft = { startDate: '', endDate: '', reason: '' };
  }

  saveEdit(req: HolidayRequest): void {
    const user = this.userState.currentUser();
    if (!user) return;

    this.api.updateRequest(req.id, {
      userId: user.id,
      startDate: this.editDraft.startDate,
      endDate: this.editDraft.endDate,
      reason: this.editDraft.reason,
    }).subscribe({
      next: () => {
        this.snackBar.open(
          req.status === 'approved' ? 'Request updated and sent back for approval.' : 'Request updated.',
          'OK',
          { duration: 3500 },
        );
        this.cancelEdit();
        this.loadRequests();
      },
      error: (err) => {
        const msg = err?.error?.error || 'Failed to update request.';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      },
    });
  }

  deleteRequest(req: HolidayRequest): void {
    const user = this.userState.currentUser();
    if (!user) return;

    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Delete this vacation request? This action cannot be undone.')
      : false;
    if (!confirmed) return;

    this.api.deleteRequest(req.id, user.id).subscribe({
      next: () => {
        this.snackBar.open('Request deleted.', 'OK', { duration: 3000 });
        this.cancelEdit();
        this.loadRequests();
      },
      error: (err) => {
        const msg = err?.error?.error || 'Failed to delete request.';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      },
    });
  }

  openHREmail(req: HolidayRequest): void {
    this.api.getHREmailDraft(req.id).subscribe({
      next: (draft: HREmailDraft) => {
        const dialogRef = this.dialog.open(HREmailDialogComponent, {
          width: '580px',
          data: draft,
        });
        dialogRef.afterClosed().subscribe((confirmed: boolean) => {
          if (confirmed) {
            this.snackBar.open('Gmail opened — review and send to HR.', 'OK', { duration: 4000 });
          }
        });
      },
      error: () => this.snackBar.open('Failed to load HR email draft.', 'Dismiss', { duration: 3000 }),
    });
  }
}
