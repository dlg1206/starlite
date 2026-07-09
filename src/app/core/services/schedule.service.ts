import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ScheduleRequest, ScheduleResponse, ScheduledCourse } from '../models/schedule.model';
import { rethrowAsApiError } from './catalog.service';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  generateSchedules(
    campusCode: string,
    termCode: string,
    request: ScheduleRequest,
  ): Observable<ScheduledCourse[][]> {
    return this.http
      .post<ScheduleResponse>(
        `${this.base}/campuses/${encodeURIComponent(campusCode)}/terms/${encodeURIComponent(termCode)}/schedule`,
        request,
      )
      .pipe(map((res) => res.schedules), catchError(rethrowAsApiError));
  }
}
