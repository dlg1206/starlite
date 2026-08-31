import { Injectable } from '@angular/core';

/**
 * Serves catalog responses from a static snapshot bundled at build time
 * (src/assets/data/endpoint.json) so the app keeps working when deployed
 * without a reachable API (offline mode). The snapshot maps a request path
 * to its response body (matching the live API shape). Keys are matched
 * case-insensitively, since the snapshot lowercases subject codes while the
 * app sends them uppercase. Schedule endpoints are not part of the snapshot
 * and are intentionally left uncached.
 */
/** Metadata about the job that produced the snapshot (src/assets/data/job_status.json). */
interface SnapshotStatus {
  finished_at?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  private static readonly SNAPSHOT_URL = 'assets/data/endpoint.json';
  private static readonly STATUS_URL = 'assets/data/job_status.json';

  private entries: Promise<Map<string, unknown>> | null = null;

  /** Returns the cached response body for a request URL, or null if not in the snapshot. */
  lookup(url: string): Promise<unknown | null> {
    return this.load().then((entries) => entries.get(url.toLowerCase()) ?? null);
  }

  /** ISO timestamp of when the snapshot was last generated, or null if unavailable. */
  getLastUpdated(): Promise<string | null> {
    return fetch(OfflineCacheService.STATUS_URL)
      .then((res) => res.json() as Promise<SnapshotStatus>)
      .then((status) => status.finished_at ?? null)
      .catch(() => null);
  }

  /** Fetches and normalizes the snapshot once, memoizing the result. */
  private load(): Promise<Map<string, unknown>> {
    if (!this.entries) {
      this.entries = fetch(OfflineCacheService.SNAPSHOT_URL)
        .then((res) => res.json() as Promise<Record<string, unknown>>)
        .then((raw) => {
          const entries = new Map<string, unknown>();
          for (const [key, body] of Object.entries(raw)) {
            entries.set(key.toLowerCase(), body);
          }
          return entries;
        });
    }
    return this.entries;
  }
}
