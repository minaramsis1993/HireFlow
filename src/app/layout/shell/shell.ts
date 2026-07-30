import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '@core/auth/auth-service';
import { USER_ROLE_LABELS, userInitials } from '@core/models';
import { ThemeService } from '@core/services/theme-service';

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

const RECRUITER_NAV: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Jobs', icon: 'work_outline', route: '/jobs' },
  { label: 'Candidates', icon: 'people_outline', route: '/candidates' },
  { label: 'Pipeline', icon: 'view_kanban', route: '/pipeline' },
];

const CANDIDATE_NAV: readonly NavItem[] = [
  { label: 'Jobs', icon: 'work_outline', route: '/jobs' },
  { label: 'My applications', icon: 'assignment', route: '/applications' },
  { label: 'Profile', icon: 'person_outline', route: '/profile' },
];

/**
 * Application chrome: toolbar, navigation drawer and the routed content area.
 * The drawer is role-aware — hiding a link is convenience, the route guards are
 * what actually enforce access.
 */
@Component({
  selector: 'app-shell',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly roleLabels = USER_ROLE_LABELS;
  protected readonly initials = userInitials;

  protected readonly navItems = computed<readonly NavItem[]>(() =>
    this.auth.isRecruiter() ? RECRUITER_NAV : CANDIDATE_NAV,
  );

  /** Below tablet width the drawer becomes an overlay that closes on navigation. */
  protected readonly isCompact = toSignal(
    this.breakpoints
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly drawerMode = computed<'over' | 'side'>(() =>
    this.isCompact() ? 'over' : 'side',
  );

  private readonly userToggled = signal<boolean | null>(null);

  protected readonly drawerOpen = computed(() => this.userToggled() ?? !this.isCompact());

  protected toggleDrawer(): void {
    this.userToggled.set(!this.drawerOpen());
  }

  protected closeIfCompact(): void {
    if (this.isCompact()) {
      this.userToggled.set(false);
    }
  }

  protected signOut(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
