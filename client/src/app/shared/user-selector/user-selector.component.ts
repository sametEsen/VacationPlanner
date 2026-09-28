import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '../../core/services/api.service';
import { UserStateService } from '../../core/services/user-state.service';
import { User } from '../../core/models';

@Component({
  selector: 'app-user-selector',
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule],
  template: `
    <mat-form-field appearance="outline" class="user-select">
      <mat-label>Select User</mat-label>
      <mat-select [(ngModel)]="selectedUserId" (ngModelChange)="onUserChange($event)">
        @for (user of users(); track user.id) {
          <mat-option [value]="user.id">
            {{ user.name }}
            <span class="role-badge role-{{ user.role }}">&nbsp;({{ user.role }})</span>
          </mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [`
    :host { display: block; min-width: 0; max-width: min(230px, calc(100vw - 88px)); width: 100%; }
    .user-select { width: 100%; }
    :host ::ng-deep .mat-mdc-text-field-wrapper { background: rgba(255,255,255,0.05) !important; border-radius: 8px !important; }
    :host ::ng-deep .mat-mdc-select-value-text { color: var(--text) !important; font-size: 0.9rem; }
    :host ::ng-deep .mat-mdc-floating-label { color: rgba(255,255,255,0.5) !important; }
    :host ::ng-deep .mdc-notched-outline__leading,
    :host ::ng-deep .mdc-notched-outline__notch,
    :host ::ng-deep .mdc-notched-outline__trailing { border-color: rgba(139,92,246,0.3) !important; }
    .role-badge { font-size: 0.7rem; opacity: 0.6; text-transform: capitalize; }
  `],
})
export class UserSelectorComponent implements OnInit {
  private api = inject(ApiService);
  private userState = inject(UserStateService);
  private router = inject(Router);

  users = signal<User[]>([]);
  selectedUserId: string | null = null;

  ngOnInit(): void {
    this.api.getUsers().subscribe((users) => {
      this.users.set(users);
      if (users.length > 0) {
        this.selectedUserId = users[0].id;
        this.userState.setUser(users[0]);
      }
    });
  }

  onUserChange(userId: string): void {
    const user = this.users().find((u) => u.id === userId);
    if (user) {
      this.userState.setUser(user);
      this.router.navigate(['/dashboard']);
    }
  }
}
