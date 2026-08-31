import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { environment } from '../environments/environment';
import { SelectionPanel } from './shared/selection-panel/selection-panel';
import { SelectionStore } from './core/state/selection.store';
import { CartStore } from './core/state/cart.store';
import { CompareStore } from './core/state/compare.store';
import { OfflineCacheService } from './core/services/offline-cache.service';
import { ThemeService } from './core/services/theme.service';

const OFFLINE_NOTICE_KEY = 'starlite-offline-notice';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SelectionPanel, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(SelectionStore);
  protected readonly cart = inject(CartStore);
  protected readonly compare = inject(CompareStore);
  protected readonly themeService = inject(ThemeService);

  /** Schedule generation needs a live API, so those tabs are disabled in offline builds. */
  protected readonly offline = environment.offline;

  /** When the offline snapshot was last generated; null until loaded / when online. */
  protected readonly cacheUpdatedAt = signal<string | null>(null);

  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly showSelectionPanel = () =>
    !this.currentUrl().startsWith('/schedule') && !this.currentUrl().startsWith('/compare');

  protected readonly showDisclaimer = signal(true);

  /** One-time popup on the first visit of an offline deployment. */
  protected readonly showOfflineNotice = signal(
    this.offline && localStorage.getItem(OFFLINE_NOTICE_KEY) !== 'seen',
  );

  constructor() {
    if (this.offline) {
      inject(OfflineCacheService)
        .getLastUpdated()
        .then((finishedAt) => this.cacheUpdatedAt.set(finishedAt));
    }
  }

  dismissDisclaimer(): void {
    this.showDisclaimer.set(false);
  }

  dismissOfflineNotice(): void {
    localStorage.setItem(OFFLINE_NOTICE_KEY, 'seen');
    this.showOfflineNotice.set(false);
  }
}
