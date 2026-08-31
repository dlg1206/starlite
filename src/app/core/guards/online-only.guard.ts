import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { environment } from '../../../environments/environment';

/**
 * Blocks schedule-related routes when the app is running without an API
 * (offline mode), since schedule generation is not part of the offline
 * snapshot. Redirects to the search page.
 */
export const onlineOnlyGuard: CanMatchFn = () => {
  if (!environment.offline) return true;
  return inject(Router).createUrlTree(['/search']);
};
