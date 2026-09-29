import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { App } from './app';
import { UserStateService } from './core/services/user-state.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: UserStateService,
          useValue: {
            currentUser: signal({ id: 'u1', name: 'Test User', email: 'test@example.com', role: 'manager', totalHolidayDays: 25 }),
            isAdmin: signal(true),
            isManager: signal(true),
            logout: () => of(undefined),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Vacation Planner');
    expect(compiled.querySelectorAll('mat-nav-list a').length).toBeGreaterThanOrEqual(3);
  });

  it('should close the mobile drawer after choosing a route', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.compact.set(true);
    app.menuOpen.set(true);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('mat-nav-list a')?.dispatchEvent(new Event('click'));
    expect(app.menuOpen()).toBe(false);
  });

  it('should toggle the compact navigation from the toolbar', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.compact.set(true);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="Toggle navigation"]');
    expect(button).not.toBeNull();
    button!.click();
    expect(app.menuOpen()).toBe(true);
    app.onOpenedChange(false);
    expect(app.menuOpen()).toBe(false);
  });
});
