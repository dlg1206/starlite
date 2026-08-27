import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Schedule, ScheduleRequest, ScheduleResponse } from '../models/schedule.model';
import { rethrowAsApiError } from './catalog.service';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  generateSchedules(
    campusCode: string,
    termCode: string,
    request: ScheduleRequest,
  ): Observable<Schedule[]> {
    return this.http
      .post<ScheduleResponse>(
        `${this.base}/campuses/${encodeURIComponent(campusCode)}/terms/${encodeURIComponent(termCode)}/schedule`,
        request,
      )
      .pipe(map((res) => res.schedules), catchError(rethrowAsApiError));
  }

  /**
   * Fetches the ICS file content for a schedule. The API returns `ics_url` as an
   * absolute URL pointing at itself, which isn't reachable directly from the browser
   * (only the GUI's reverse proxy can reach the API) — so only its path is used,
   * requested through our own origin the same way every other catalog/schedule call is.
   * The filename the API assigns (via `Content-Disposition`) is preserved for the caller.
   */
  downloadIcs(icsUrl: string): Observable<{ blob: Blob; filename: string }> {
    const path = new URL(icsUrl).pathname;
    return this.http
      .get(path, { responseType: 'blob', observe: 'response' })
      .pipe(
        map((res) => ({
          blob: res.body as Blob,
          filename: filenameFromContentDisposition(res.headers.get('Content-Disposition')) ?? 'schedule.ics',
        })),
        catchError(rethrowAsApiError),
      );
  }
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
}
