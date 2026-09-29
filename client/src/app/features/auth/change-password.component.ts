import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../core/services/api.service';
import { UserStateService } from '../../core/services/user-state.service';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <main class="auth-page">
      <section class="auth-panel">
        <div class="brand-mark"><mat-icon>lock_reset</mat-icon></div>
        <p class="eyebrow">Account security</p>
        <h1>Change password</h1>
        <p class="intro">Choose a new password with at least 12 characters. You’ll sign in again after it changes.</p>
        <form (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Current password</mat-label>
            <input matInput type="password" name="currentPassword" [(ngModel)]="currentPassword" autocomplete="current-password" required />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>New password</mat-label>
            <input matInput type="password" name="newPassword" [(ngModel)]="newPassword" autocomplete="new-password" minlength="12" required />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Confirm new password</mat-label>
            <input matInput type="password" name="confirmPassword" [(ngModel)]="confirmPassword" autocomplete="new-password" required />
          </mat-form-field>
          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <button mat-flat-button color="primary" type="submit" [disabled]="busy() || !currentPassword || newPassword.length < 12 || !confirmPassword">
            @if (busy()) { Updating… } @else { Update password }
          </button>
        </form>
      </section>
    </main>
  `,
  styles: [`
    .auth-page { min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: radial-gradient(ellipse at 15% 15%, rgba(26, 126, 118, .24), transparent 42%), linear-gradient(145deg, #111a1d, #17242a 55%, #252d31); }
    .auth-panel { width: min(100%, 460px); padding: 38px; border: 1px solid rgba(197, 217, 209, .18); border-radius: 8px; background: rgba(20, 31, 34, .94); box-shadow: 0 22px 70px rgba(0, 0, 0, .28); animation: arrive .28s ease-out both; }
    .brand-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 8px; background: #c2e35b; color: #17241f; }
    .eyebrow { margin: 24px 0 6px; color: #c2e35b; font-size: .75rem; text-transform: uppercase; }
    h1 { margin: 0; color: #f1f5ee; font-size: 1.7rem; }
    .intro { margin: 8px 0 28px; color: #aab8b5; line-height: 1.5; }
    form { display: grid; gap: 10px; }
    mat-form-field, button { width: 100%; }
    .error { margin: 0 0 6px; color: #ff9a8b; font-size: .9rem; }
    @keyframes arrive { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 480px) { .auth-panel { padding: 28px 22px; } }
  `],
})
export class ChangePasswordComponent {
  private api = inject(ApiService);
  private userState = inject(UserStateService);
  private router = inject(Router);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  busy = signal(false);
  error = signal('');

  submit(): void {
    if (this.busy()) return;
    if (this.newPassword.length < 12 || this.newPassword.length > 128) {
      this.error.set('New password must be between 12 and 128 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('The new passwords do not match.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.api.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => this.userState.logout().subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => this.router.navigate(['/login']),
      }),
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Unable to change password.');
        this.busy.set(false);
      },
    });
  }
}