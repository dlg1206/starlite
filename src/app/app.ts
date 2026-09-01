import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { environment } from '../environments/environment';
import { SelectionPanel } from './shared/selection-panel/selection-panel';
import { SelectionStore } from './core/state/selection.store';
import { CartStore } from './core/state/cart.store';
import { CompareStore } from './core/state/compare.store';
import { OfflineCacheService, SnapshotMetadata } from './core/services/offline-cache.service';
import { ThemeService } from './core/services/theme.service';

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

  /** Offline snapshot metadata; null until loaded / when online. */
  protected readonly cacheMetadata = signal<SnapshotMetadata | null>(null);

  /** Briefly true after the checksum is copied, to show confirmation. */
  protected readonly checksumCopied = signal(false);

  /**
   * `finished_at` is UTC but stored without a zone suffix (so it would parse as
   * local time); mark it as UTC so DatePipe renders it in the client's local zone.
   */
  protected readonly cacheCheckedAt = computed<Date | null>(() => {
    const finishedAt = this.cacheMetadata()?.finished_at;
    return finishedAt ? new Date(ensureUtc(finishedAt)) : null;
  });

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

  constructor() {
    if (this.offline) {
      inject(OfflineCacheService)
        .getMetadata()
        .then((metadata) => this.cacheMetadata.set(metadata));
    }
  }

  dismissDisclaimer(): void {
    this.showDisclaimer.set(false);
  }

  dismissOfflineNotice(): void {
    this.showOfflineNotice.set(false);
  }

  async copyChecksum(): Promise<void> {
    const checksum = this.cacheMetadata()?.checksum;
    if (!checksum) return;
    await navigator.clipboard.writeText(checksum);
    this.checksumCopied.set(true);
    setTimeout(() => this.checksumCopied.set(false), 1500);
  }
}

/** Appends a UTC designator to an ISO timestamp that lacks a timezone offset. */
function ensureUtc(iso: string): string {
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
}
