import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { offlineCacheInterceptor } from './core/interceptors/offline-cache.interceptor';
import { OfflineCacheService } from './core/services/offline-cache.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([offlineCacheInterceptor])),
    // In offline builds, refuse to start unless the bundled data files are present.
    provideAppInitializer(() =>
      environment.offline ? inject(OfflineCacheService).verify() : undefined,
    ),
  ],
};
