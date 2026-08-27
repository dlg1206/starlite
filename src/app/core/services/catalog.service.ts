import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiError, ApiErrorBody } from '../models/api-error.model';
import { Course, CourseResponse } from '../models/catalog.model';
import { CourseFilterRequest } from '../models/course-filter.model';
import { Identifier, IdentifierResponse } from '../models/identifier.model';
import { TtlCache } from './ttl-cache';

const COURSE_CACHE_TTL_MS = 30 * 60 * 1000;

/** Wraps the read-only catalog endpoints: campuses, terms, subjects, and courses. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  /** Cached per subject (not per whole query) so a request for N subjects only fetches whichever aren't already cached. */
  private readonly courseCache = new TtlCache<Course[]>(COURSE_CACHE_TTL_MS);

  getCampuses(): Observable<Identifier[]> {
    return this.http
      .get<IdentifierResponse>(`${this.base}/campuses`)
      .pipe(map((res) => res.identifiers), catchError(rethrowAsApiError));
  }

  getTerms(campusCode: string): Observable<Identifier[]> {
    return this.http
      .get<IdentifierResponse>(`${this.base}/campuses/${encodeURIComponent(campusCode)}/terms`)
      .pipe(map((res) => res.identifiers), catchError(rethrowAsApiError));
  }

  getSubjects(campusCode: string, termCode: string): Observable<Identifier[]> {
    return this.http
      .get<IdentifierResponse>(
        `${this.base}/campuses/${encodeURIComponent(campusCode)}/terms/${encodeURIComponent(termCode)}/subjects`,
      )
      .pipe(map((res) => res.identifiers), catchError(rethrowAsApiError));
  }

  /** Fetches one subject at a time via the single-subject endpoint; only subjects not already cached (client-side, 30 min TTL) hit the network. */
  getCourses(
    campusCode: string,
    termCode: string,
    subjects: string[],
    detailed = false,
  ): Observable<Course[]> {
    const { cached, missingSubjects } = this.splitBySubjectCache(
      'get',
      campusCode,
      termCode,
      subjects,
      detailed,
      undefined,
    );
    if (missingSubjects.length === 0) return of(sortCourses(cached));

    const params = buildDetailedParams(detailed);
    return forkJoin(
      missingSubjects.map((subject) =>
        this.http
          .get<CourseResponse>(this.subjectUrl(campusCode, termCode, subject), { params })
          .pipe(
            map((res) => res.courses),
            tap((courses) =>
              this.courseCache.set(
                subjectCacheKey('get', campusCode, termCode, subject, detailed, undefined),
                courses,
              ),
            ),
          ),
      ),
    ).pipe(
      map((fetched) => sortCourses([...cached, ...fetched.flat()])),
      catchError(rethrowAsApiError),
    );
  }

  /** Fetches one subject at a time via the single-subject endpoint; only subjects not already cached for this exact filter (client-side, 30 min TTL) hit the network. */
  filterCourses(
    campusCode: string,
    termCode: string,
    subjects: string[],
    filter: CourseFilterRequest,
    detailed = false,
  ): Observable<Course[]> {
    const { cached, missingSubjects } = this.splitBySubjectCache(
      'filter',
      campusCode,
      termCode,
      subjects,
      detailed,
      filter,
    );
    if (missingSubjects.length === 0) return of(sortCourses(cached));

    const params = buildDetailedParams(detailed);
    return forkJoin(
      missingSubjects.map((subject) =>
        this.http
          .post<CourseResponse>(this.subjectUrl(campusCode, termCode, subject), filter, { params })
          .pipe(
            map((res) => res.courses),
            tap((courses) =>
              this.courseCache.set(
                subjectCacheKey('filter', campusCode, termCode, subject, detailed, filter),
                courses,
              ),
            ),
          ),
      ),
    ).pipe(
      map((fetched) => sortCourses([...cached, ...fetched.flat()])),
      catchError(rethrowAsApiError),
    );
  }

  private subjectUrl(campusCode: string, termCode: string, subjectCode: string): string {
    return `${this.base}/campuses/${encodeURIComponent(campusCode)}/terms/${encodeURIComponent(termCode)}/subjects/${encodeURIComponent(subjectCode)}`;
  }

  private splitBySubjectCache(
    kind: CacheKind,
    campusCode: string,
    termCode: string,
    subjects: string[],
    detailed: boolean,
    filter: CourseFilterRequest | undefined,
  ): { cached: Course[]; missingSubjects: string[] } {
    const cached: Course[] = [];
    const missingSubjects: string[] = [];
    for (const subject of subjects) {
      const hit = this.courseCache.get(
        subjectCacheKey(kind, campusCode, termCode, subject, detailed, filter),
      );
      if (hit) cached.push(...hit);
      else missingSubjects.push(subject);
    }
    return { cached, missingSubjects };
  }
}

type CacheKind = 'get' | 'filter';

function subjectCacheKey(
  kind: CacheKind,
  campusCode: string,
  termCode: string,
  subject: string,
  detailed: boolean,
  filter: CourseFilterRequest | undefined,
): string {
  return JSON.stringify([kind, campusCode, termCode, subject.toUpperCase(), detailed, filter ?? null]);
}

function sortCourses(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => {
    if (a.subject_code !== b.subject_code) return a.subject_code.localeCompare(b.subject_code);
    const aNum = parseInt(a.course_number, 10) || 0;
    const bNum = parseInt(b.course_number, 10) || 0;
    if (aNum !== bNum) return aNum - bNum;
    return a.course_number.localeCompare(b.course_number);
  });
}

function buildDetailedParams(detailed: boolean): HttpParams {
  return detailed ? new HttpParams().set('detailed', 'true') : new HttpParams();
}

export function rethrowAsApiError(err: unknown): Observable<never> {
  if (err instanceof HttpErrorResponse) {
    const body = (err.error ?? null) as ApiErrorBody | null;
    return throwError(() => new ApiError(err.status, body));
  }
  return throwError(() => err);
}
