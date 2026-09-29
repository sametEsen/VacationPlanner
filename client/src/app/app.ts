import { Component, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { UserStateService } from './core/services/user-state.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private userState = inject(UserStateService);
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  readonly currentUser = this.userState.currentUser;
  readonly isAdmin = this.userState.isAdmin;
  readonly compact = signal(this.breakpointObserver.isMatched('(max-width: 899px)'));
  readonly menuOpen = signal(false);
  readonly logoutError = signal(false);

  constructor() {
    this.breakpointObserver.observe('(max-width: 899px)')
      .pipe(takeUntilDestroyed())
      .subscribe(({ matches }) => {
        this.compact.set(matches);
        this.menuOpen.set(false);
      });
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onOpenedChange(opened: boolean): void {
    if (this.compact()) this.menuOpen.set(opened);
  }

  logout(): void {
    this.logoutError.set(false);
    this.userState.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.logoutError.set(true),
    });
  }
}
