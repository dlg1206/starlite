import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { OfflineCacheService } from '../services/offline-cache.service';

/**
 * In offline builds (environment.offline), answers catalog GET requests from
 * the bundled snapshot instead of hitting the network. Requests not present in
 * the snapshot (e.g. schedule endpoints) fall through to the real HTTP handler.
 * A no-op in online builds.
 */
export const offlineCacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.offline || req.method !== 'GET') return next(req);

  const cache = inject(OfflineCacheService);
  return from(cache.lookup(req.url)).pipe(
    switchMap((body) =>
      body === null
        ? next(req)
        : of(new HttpResponse({ status: 200, url: req.urlWithParams, body })),
    ),
  );
};
