import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HREmailDraft } from '../../core/models';

@Component({
  selector: 'app-hr-email-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>email</mat-icon> HR Notification Email
    </h2>
    <mat-dialog-content>
      <p class="info">
        <mat-icon class="info-icon">info</mat-icon>
        Copy the body text below, then click <strong>Open Gmail</strong>. Your signature will appear automatically — paste the body above it.
      </p>
      <mat-form-field appearance="outline" class="field">
        <mat-label>To</mat-label>
        <input matInput [value]="draft.to" readonly />
      </mat-form-field>
      <mat-form-field appearance="outline" class="field">
        <mat-label>Subject</mat-label>
        <input matInput [(ngModel)]="draft.subject" />
      </mat-form-field>
      <div class="body-wrapper">
        <mat-form-field appearance="outline" class="field">
          <mat-label>Body</mat-label>
          <textarea matInput [(ngModel)]="draft.body" rows="8"></textarea>
        </mat-form-field>
        <button mat-icon-button class="copy-btn"
          [matTooltip]="copied() ? 'Copied!' : 'Copy body'"
          (click)="copyBody()">
          <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
        </button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="send()">
        <mat-icon>open_in_new</mat-icon> Open Gmail
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; color: var(--text); }
    h2 mat-icon { color: var(--cyan); }
    .info {
      display: flex; align-items: flex-start; gap: 8px;
      color: var(--text-muted); margin-bottom: 12px; font-size: 0.88rem;
      background: rgba(99,102,241,0.1); border-left: 3px solid var(--indigo);
      padding: 10px 12px; border-radius: 6px; line-height: 1.5;
    }
    .info-icon { font-size: 18px; width: 18px; height: 18px; color: var(--indigo); flex-shrink: 0; margin-top: 1px; }
    .info strong { color: var(--text); }
    .field { width: 100%; margin-bottom: 8px; }
    mat-dialog-content { min-width: 500px; }
    .body-wrapper { position: relative; }
    .copy-btn {
      position: absolute; top: 8px; right: 4px;
      color: var(--text-muted);
      transition: color 0.2s;
    }
    .copy-btn:hover { color: var(--cyan); }
  `],
})
export class HREmailDialogComponent {
  dialogRef = inject(MatDialogRef<HREmailDialogComponent>);
  draft: HREmailDraft = inject(MAT_DIALOG_DATA);
  copied = signal(false);

  copyBody(): void {
    navigator.clipboard.writeText(this.draft.body).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  send(): void {
    const url = new URL('https://mail.google.com/mail/');
    url.searchParams.set('view', 'cm');
    url.searchParams.set('fs', '1');
    url.searchParams.set('to', this.draft.to);
    url.searchParams.set('su', this.draft.subject);
    // Body intentionally omitted so Gmail auto-injects the user's saved signature
    window.open(url.toString(), '_blank');
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
