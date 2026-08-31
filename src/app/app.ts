import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { environment } from '../environments/environment';
import { SelectionPanel } from './shared/selection-panel/selection-panel';
import { SelectionStore } from './core/state/selection.store';
import { CartStore } from './core/state/cart.store';
import { CompareStore } from './core/state/compare.store';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SelectionPanel],
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

  /** Shown on every load of an offline deployment until dismissed for the session. */
  protected readonly showOfflineNotice = signal(this.offline);

  dismissDisclaimer(): void {
    this.showDisclaimer.set(false);
  }

  dismissOfflineNotice(): void {
    this.showOfflineNotice.set(false);
  }
}
