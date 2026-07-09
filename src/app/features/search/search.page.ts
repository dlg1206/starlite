import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CatalogService } from '../../core/services/catalog.service';
import { SelectionStore } from '../../core/state/selection.store';
import { ApiError } from '../../core/models/api-error.model';
import { Course } from '../../core/models/catalog.model';
import { CourseFilterRequest } from '../../core/models/course-filter.model';
import { ChipInput } from '../../shared/chip-input/chip-input';
import { CourseCard } from '../../shared/course-card/course-card';
import { WEEKDAYS, Day } from '../../core/models/catalog.model';
import { csvToList, csvToNumberList } from '../../shared/csv';

type TriState = '' | 'true' | 'false';

const SEARCH_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [FormsModule, CourseCard, ChipInput],
  templateUrl: './search.page.html',
  styleUrl: './search.page.scss',
})
export class SearchPage {
  protected readonly store = inject(SelectionStore);
  private readonly catalog = inject(CatalogService);

  protected readonly weekdays = WEEKDAYS;
  protected readonly filtersOpen = signal(false);
  protected readonly titleFilter = signal('');

  protected readonly acceptDays = signal<Set<Day>>(new Set());
  protected readonly rejectDays = signal<Set<Day>>(new Set());

  protected readonly acceptInstructors = signal<string[]>([]);
  protected readonly rejectInstructors = signal<string[]>([]);
  protected readonly acceptTitleKeywords = signal<string[]>([]);
  protected readonly rejectTitleKeywords = signal<string[]>([]);
  protected readonly acceptDescKeywords = signal<string[]>([]);
  protected readonly rejectDescKeywords = signal<string[]>([]);

  protected readonly acceptCourseNumbers = signal('');
  protected readonly rejectCourseNumbers = signal('');
  protected readonly acceptCrns = signal('');
  protected readonly rejectCrns = signal('');
  protected readonly startAfter = signal('');
  protected readonly endBefore = signal('');
  protected readonly onlyOnline = signal<TriState>('');
  protected readonly onlyAsync = signal<TriState>('');
  protected readonly hasMajorRestriction = signal<TriState>('');
  protected readonly hasPrereq = signal<TriState>('');
  protected readonly canAudit = signal<TriState>('');
  protected readonly excludeFull = signal(false);
  protected readonly excludeWaitlisted = signal(false);

  protected readonly results = signal<Course[] | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hasSearched = signal(false);

  protected readonly resultCount = computed(() => this.results()?.length ?? 0);

  protected readonly filteredResults = computed<Course[] | null>(() => {
    const all = this.results();
    if (!all) return null;
    const query = this.titleFilter().trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (course) =>
        (course.subject_code+ " " + course.course_number).includes(query.toUpperCase()) ||
        course.name.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query),
    );
  });

  protected readonly visibleCount = computed(() => this.filteredResults()?.length ?? 0);

  private debounceHandle: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const campus = this.store.selectedCampus();
      const term = this.store.selectedTerm();
      const subjects = Array.from(this.store.selectedSubjects());

      // establish dependency on every filter control so changing any of them
      // re-triggers a search automatically, without a manual Search button
      this.acceptDays();
      this.rejectDays();
      this.acceptInstructors();
      this.rejectInstructors();
      this.acceptTitleKeywords();
      this.rejectTitleKeywords();
      this.acceptDescKeywords();
      this.rejectDescKeywords();
      this.acceptCourseNumbers();
      this.rejectCourseNumbers();
      this.acceptCrns();
      this.rejectCrns();
      this.startAfter();
      this.endBefore();
      this.onlyOnline();
      this.onlyAsync();
      this.hasMajorRestriction();
      this.hasPrereq();
      this.canAudit();
      this.excludeFull();
      this.excludeWaitlisted();

      if (this.debounceHandle) clearTimeout(this.debounceHandle);
      if (!campus || !term || subjects.length === 0) return;

      this.debounceHandle = setTimeout(() => this.search(), SEARCH_DEBOUNCE_MS);
    });
  }

  toggleDay(bucket: 'accept' | 'reject', day: Day): void {
    const target = bucket === 'accept' ? this.acceptDays : this.rejectDays;
    const next = new Set(target());
    if (next.has(day)) next.delete(day);
    else next.add(day);
    target.set(next);
  }

  isDaySelected(bucket: 'accept' | 'reject', day: Day): boolean {
    return (bucket === 'accept' ? this.acceptDays() : this.rejectDays()).has(day);
  }

  resetFilters(): void {
    this.acceptCourseNumbers.set('');
    this.rejectCourseNumbers.set('');
    this.acceptCrns.set('');
    this.rejectCrns.set('');
    this.startAfter.set('');
    this.endBefore.set('');
    this.onlyOnline.set('');
    this.onlyAsync.set('');
    this.hasMajorRestriction.set('');
    this.hasPrereq.set('');
    this.canAudit.set('');
    this.excludeFull.set(false);
    this.excludeWaitlisted.set(false);
    this.acceptDays.set(new Set());
    this.rejectDays.set(new Set());
    this.acceptInstructors.set([]);
    this.rejectInstructors.set([]);
    this.acceptTitleKeywords.set([]);
    this.rejectTitleKeywords.set([]);
    this.acceptDescKeywords.set([]);
    this.rejectDescKeywords.set([]);
  }

  private search(): void {
    const campus = this.store.selectedCampus();
    const term = this.store.selectedTerm();
    const subjects = Array.from(this.store.selectedSubjects());
    if (!campus || !term || subjects.length === 0) return;

    this.loading.set(true);
    this.error.set(null);
    this.hasSearched.set(true);
    this.titleFilter.set('');

    const filter = this.buildFilterRequest();

    this.catalog.filterCourses(campus, term, subjects, filter, true).subscribe({
      next: (courses) => {
        this.results.set(courses);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof ApiError ? err.message : 'Failed to search courses.');
        this.loading.set(false);
      },
    });
  }

  private buildFilterRequest(): CourseFilterRequest {
    return {
      accept_course_numbers: csvToList(this.acceptCourseNumbers()),
      reject_course_numbers: csvToList(this.rejectCourseNumbers()),
      accept_crns: csvToNumberList(this.acceptCrns()),
      reject_crns: csvToNumberList(this.rejectCrns()),
      accept_days: this.acceptDays().size ? Array.from(this.acceptDays()) : undefined,
      reject_days: this.rejectDays().size ? Array.from(this.rejectDays()) : undefined,
      start_after: this.startAfter() || undefined,
      end_before: this.endBefore() || undefined,
      only_online: triStateToBool(this.onlyOnline()),
      only_async: triStateToBool(this.onlyAsync()),
      has_major_restriction: triStateToBool(this.hasMajorRestriction()),
      has_prereq: triStateToBool(this.hasPrereq()),
      can_audit: triStateToBool(this.canAudit()),
      exclude_full: this.excludeFull() || undefined,
      exclude_waitlisted: this.excludeWaitlisted() || undefined,
      accept_instructors: this.acceptInstructors().length ? this.acceptInstructors() : undefined,
      reject_instructors: this.rejectInstructors().length ? this.rejectInstructors() : undefined,
      accept_title_keywords: this.acceptTitleKeywords().length
        ? this.acceptTitleKeywords()
        : undefined,
      reject_title_keywords: this.rejectTitleKeywords().length
        ? this.rejectTitleKeywords()
        : undefined,
      accept_desc_keywords: this.acceptDescKeywords().length
        ? this.acceptDescKeywords()
        : undefined,
      reject_desc_keywords: this.rejectDescKeywords().length
        ? this.rejectDescKeywords()
        : undefined,
    };
  }
}

function triStateToBool(value: TriState): boolean | undefined {
  if (value === '') return undefined;
  return value === 'true';
}
