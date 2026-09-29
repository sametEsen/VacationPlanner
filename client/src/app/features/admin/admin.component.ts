import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { EuDatePipe } from '../../shared/eu-date.pipe';
import { ApiService } from '../../core/services/api.service';
import { CompanyHoliday, User } from '../../core/models';

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatChipsModule,
    EuDatePipe,
  ],
  template: `
    <div class="admin-page">
      <h2 class="page-title">
        <mat-icon>settings</mat-icon> Admin
      </h2>

      <!-- ── TEAM MEMBERS ── -->
      <mat-card class="add-card">
        <mat-card-header>
          <mat-card-title>Add Colleague</mat-card-title>
          <mat-card-subtitle>Add a new team member to the planner</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Full Name</mat-label>
              <input matInput [(ngModel)]="newUser.name" placeholder="e.g. Jan de Vries" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="newUser.email" placeholder="jan@company.nl" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="narrow">
              <mat-label>Role</mat-label>
              <mat-select [(ngModel)]="newUser.role">
                <mat-option value="employee">Employee</mat-option>
                <mat-option value="manager">Manager</mat-option>
                <mat-option value="hr">HR</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="narrow">
              <mat-label>Holiday Days</mat-label>
              <input matInput type="number" [(ngModel)]="newUser.totalHolidayDays" min="1" max="40" />
            </mat-form-field>
            <button
              mat-raised-button color="primary"
              [disabled]="!newUser.name || !newUser.email"
              (click)="addUser()"
            >
              <mat-icon>person_add</mat-icon> Add
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      @if (newAccountCredentials(); as credentials) {
        <section class="credential-notice" role="status">
          <div>
            <strong>One-time sign-in details for {{ credentials.email }}</strong>
            <p>Share this temporary password securely. It will not be shown again.</p>
            <code>{{ credentials.password }}</code>
          </div>
          <button mat-button type="button" (click)="newAccountCredentials.set(null)">Dismiss</button>
        </section>
      }

      <mat-card style="margin-bottom:24px">
        <mat-card-header>
          <mat-card-title>Team Members</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (users().length === 0) {
            <p class="empty">No team members found.</p>
          } @else {
            <div class="table-scroll"><table mat-table [dataSource]="users()" class="holidays-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let u">
                  @if (editingId === u.id) {
                    <mat-form-field appearance="outline" class="cell-field">
                      <input matInput [(ngModel)]="editDraft.name" />
                    </mat-form-field>
                  } @else {
                    {{ u.name }}
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let u">
                  @if (editingId === u.id) {
                    <mat-form-field appearance="outline" class="cell-field">
                      <input matInput type="email" [(ngModel)]="editDraft.email" />
                    </mat-form-field>
                  } @else {
                    <span class="muted">{{ u.email }}</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let u">
                  @if (editingId === u.id) {
                    <mat-form-field appearance="outline" class="cell-field narrow">
                      <mat-select [(ngModel)]="editDraft.role">
                        <mat-option value="employee">Employee</mat-option>
                        <mat-option value="manager">Manager</mat-option>
                        <mat-option value="hr">HR</mat-option>
                      </mat-select>
                    </mat-form-field>
                  } @else {
                    <span class="role-chip" [class]="'role-' + u.role">{{ u.role }}</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="days">
                <th mat-header-cell *matHeaderCellDef>Holiday Days</th>
                <td mat-cell *matCellDef="let u">
                  @if (editingId === u.id) {
                    <mat-form-field appearance="outline" class="cell-field narrow">
                      <input matInput type="number" [(ngModel)]="editDraft.totalHolidayDays" min="1" max="40" />
                    </mat-form-field>
                  } @else {
                    {{ u.totalHolidayDays }}
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let u">
                  @if (editingId === u.id) {
                    <button mat-icon-button color="primary" (click)="saveUser(u)" matTooltip="Save">
                      <mat-icon>check</mat-icon>
                    </button>
                    <button mat-icon-button (click)="cancelEdit()" matTooltip="Cancel">
                      <mat-icon>close</mat-icon>
                    </button>
                  } @else {
                    <button mat-icon-button (click)="startEdit(u)" matTooltip="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteUser(u)" matTooltip="Remove colleague">
                      <mat-icon>person_remove</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="userColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: userColumns;" [class.editing-row]="editingId === row.id"></tr>
            </table></div>
          }
        </mat-card-content>
      </mat-card>

      <mat-divider style="margin-bottom:24px"></mat-divider>

      <!-- ── COMPANY HOLIDAYS ── -->
      <mat-card class="add-card">
        <mat-card-header>
          <mat-card-title>Add Company Holiday</mat-card-title>
          <mat-card-subtitle>These are additional days off (e.g. Goede Vrijdag, Bedrijfsdag)</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Holiday Name</mat-label>
              <input matInput [(ngModel)]="newName" placeholder="e.g. Goede Vrijdag" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput type="date" [(ngModel)]="newDate" />
            </mat-form-field>
            <button
              mat-raised-button color="primary"
              [disabled]="!newName || !newDate"
              (click)="addHoliday()"
            >
              <mat-icon>add</mat-icon> Add
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ year }} Company Holidays</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (holidays().length === 0) {
            <p class="empty">No company holidays defined for {{ year }}.</p>
          } @else {
            <div class="table-scroll"><table mat-table [dataSource]="holidays()" class="holidays-table">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let h">{{ h.date | euDate }}</td>
              </ng-container>
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let h">{{ h.name }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let h">
                  <button mat-icon-button color="warn" (click)="deleteHoliday(h)" matTooltip="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table></div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 860px; }

    .add-card {
      background: var(--bg-surface) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius) !important;
      margin-bottom: 16px !important;
    }

    .form-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
    .form-row mat-form-field { flex: 1; min-width: 160px; }
    .form-row mat-form-field.narrow { flex: 0 1 130px; min-width: 110px; }
    .credential-notice { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 0 0 16px; padding: 16px; border-left: 3px solid #c2e35b; background: rgba(194, 227, 91, .08); color: var(--text); }
    .credential-notice p { margin: 6px 0; color: var(--text-muted); font-size: .85rem; }
    .credential-notice code { color: #d8f28a; overflow-wrap: anywhere; }
    @media (max-width: 560px) { .credential-notice { align-items: flex-start; flex-direction: column; } }

    .holidays-table { width: 100%; background: transparent !important; }
    .table-scroll { max-width: 100%; overflow-x: auto; }
    @media (max-width: 700px) {
      .form-row mat-form-field, .form-row mat-form-field.narrow { flex: 1 1 100%; min-width: 0; }
      .holidays-table { min-width: 630px; }
      .add-card mat-card-content { padding: 16px; }
    }

    :host ::ng-deep .mat-mdc-header-row { background: rgba(255,255,255,0.03) !important; }
    :host ::ng-deep .mat-mdc-header-cell {
      color: var(--text-muted) !important;
      font-size: 0.78rem; text-transform: uppercase;
      letter-spacing: 0.6px; border-bottom-color: var(--border) !important;
    }
    :host ::ng-deep .mat-mdc-row {
      background: transparent !important;
      &:hover { background: rgba(139,92,246,0.05) !important; }
    }
    :host ::ng-deep .mat-mdc-cell {
      color: var(--text) !important;
      border-bottom-color: var(--border) !important;
      font-size: 0.9rem;
    }

    .muted { color: var(--text-muted) !important; font-size: 0.85rem; }

    .role-chip {
      display: inline-block; padding: 2px 10px; border-radius: 20px;
      font-size: 0.75rem; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase;
    }
    .role-employee { background: rgba(99,102,241,0.18); color: #a5b4fc; }
    .role-manager  { background: rgba(139,92,246,0.2);  color: #c084fc; }
    .role-hr       { background: rgba(6,182,212,0.18);  color: #67e8f9; }

    .cell-field {
      margin: 0; padding: 0;
      .mat-mdc-form-field-subscript-wrapper { display: none; }
    }
    :host ::ng-deep .cell-field .mat-mdc-form-field-subscript-wrapper { display: none !important; }
    :host ::ng-deep .cell-field.mat-mdc-form-field { margin-bottom: -8px !important; }
    :host ::ng-deep .cell-field .mdc-text-field { padding: 0 8px !important; }

    :host ::ng-deep .editing-row { background: rgba(139,92,246,0.08) !important; }

    .empty { color: var(--text-muted); padding: 20px 0; font-size: 0.9rem; }
  `],
})
export class AdminComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  year = new Date().getFullYear();
  holidays = signal<CompanyHoliday[]>([]);
  users = signal<User[]>([]);
  newAccountCredentials = signal<{ email: string; password: string } | null>(null);

  displayedColumns = ['date', 'name', 'actions'];
  userColumns = ['name', 'email', 'role', 'days', 'actions'];

  newName = '';
  newDate = '';
  newUser = { name: '', email: '', role: 'employee', totalHolidayDays: 25 };

  editingId: string | null = null;
  editDraft = { name: '', email: '', role: 'employee', totalHolidayDays: 25 };

  ngOnInit(): void {
    this.loadHolidays();
    this.loadUsers();
  }

  startEdit(u: User): void {
    this.editingId = u.id;
    this.editDraft = { name: u.name, email: u.email, role: u.role, totalHolidayDays: u.totalHolidayDays };
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveUser(u: User): void {
    if (!this.editDraft.name || !this.editDraft.email) return;
    this.api.updateUser(u.id, this.editDraft).subscribe({
      next: () => {
        this.snackBar.open('Colleague updated.', 'OK', { duration: 3000 });
        this.editingId = null;
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Failed to update colleague.';
        this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
      },
    });
  }

  loadUsers(): void {
    this.api.getUsers().subscribe((u) => this.users.set(u));
  }

  addUser(): void {
    if (!this.newUser.name || !this.newUser.email) return;
    this.api.addUser({ ...this.newUser }).subscribe({
      next: ({ user, temporaryPassword }) => {
        this.newAccountCredentials.set({ email: user.email, password: temporaryPassword });
        this.snackBar.open('Colleague added. Share the temporary password securely.', 'OK', { duration: 5000 });
        this.newUser = { name: '', email: '', role: 'employee', totalHolidayDays: 25 };
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Failed to add colleague.';
        this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
      },
    });
  }

  deleteUser(u: User): void {
    this.api.deleteUser(u.id).subscribe({
      next: () => {
        this.snackBar.open(`${u.name} removed.`, 'OK', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Failed to remove colleague.';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      },
    });
  }

  loadHolidays(): void {
    this.api.getCompanyHolidays(this.year).subscribe((h) => this.holidays.set(h));
  }

  addHoliday(): void {
    if (!this.newName || !this.newDate) return;
    this.api.addCompanyHoliday(this.newName, this.newDate).subscribe({
      next: () => {
        this.snackBar.open('Company holiday added.', 'OK', { duration: 3000 });
        this.newName = '';
        this.newDate = '';
        this.loadHolidays();
      },
      error: () => this.snackBar.open('Failed to add holiday.', 'Dismiss', { duration: 3000 }),
    });
  }

  deleteHoliday(h: CompanyHoliday): void {
    this.api.deleteCompanyHoliday(h.id).subscribe({
      next: () => {
        this.snackBar.open('Holiday removed.', 'OK', { duration: 3000 });
        this.loadHolidays();
      },
      error: () => this.snackBar.open('Failed to delete holiday.', 'Dismiss', { duration: 3000 }),
    });
  }
}
