import { Injectable, computed, inject, signal } from '@angular/core';

import { CatalogService } from '../services/catalog.service';
import { Identifier } from '../models/identifier.model';
import { ApiError } from '../models/api-error.model';

/**
 * Holds the campus/term/subjects selection shared by the search and schedule
 * pages, and the option lists those pickers are populated from. Campus is
 * required before terms can load, term before subjects can load, and at
 * least one subject must be picked before either page can query courses.
 */
@Injectable({ providedIn: 'root' })
export class SelectionStore {
  private readonly catalog = inject(CatalogService);

  readonly campuses = signal<Identifier[]>([]);
  readonly terms = signal<Identifier[]>([]);
  readonly subjects = signal<Identifier[]>([]);

  readonly campusesLoading = signal(false);
  readonly termsLoading = signal(false);
  readonly subjectsLoading = signal(false);

  readonly campusesError = signal<string | null>(null);
  readonly termsError = signal<string | null>(null);
  readonly subjectsError = signal<string | null>(null);

  readonly selectedCampus = signal<string | null>(null);
  readonly selectedTerm = signal<string | null>(null);
  readonly selectedSubjects = signal<Set<string>>(new Set());

  readonly isComplete = computed(
    () => !!this.selectedCampus() && !!this.selectedTerm() && this.selectedSubjects().size > 0,
  );

  constructor() {
    this.loadCampuses();
  }

  loadCampuses(): void {
    this.campusesLoading.set(true);
    this.campusesError.set(null);
    this.catalog.getCampuses().subscribe({
      next: (campuses) => {
        this.campuses.set(sortBy(campuses, (c) => c.value));
        this.campusesLoading.set(false);
      },
      error: (err: unknown) => {
        this.campusesError.set(messageFor(err));
        this.campusesLoading.set(false);
      },
    });
  }

  selectCampus(campusCode: string | null): void {
    if (campusCode === this.selectedCampus()) return;
    this.selectedCampus.set(campusCode);
    this.selectedTerm.set(null);
    this.selectedSubjects.set(new Set());
    this.terms.set([]);
    this.subjects.set([]);
    this.termsError.set(null);
    this.subjectsError.set(null);
    if (campusCode) this.loadTerms(campusCode);
  }

  private loadTerms(campusCode: string): void {
    this.termsLoading.set(true);
    this.catalog.getTerms(campusCode).subscribe({
      next: (terms) => {
        this.terms.set(sortBy(terms, (t) => t.id));
        this.termsLoading.set(false);
      },
      error: (err: unknown) => {
        this.termsError.set(messageFor(err));
        this.termsLoading.set(false);
      },
    });
  }

  selectTerm(termCode: string | null): void {
    if (termCode === this.selectedTerm()) return;
    this.selectedTerm.set(termCode);
    this.selectedSubjects.set(new Set());
    this.subjects.set([]);
    this.subjectsError.set(null);
    const campusCode = this.selectedCampus();
    if (campusCode && termCode) this.loadSubjects(campusCode, termCode);
  }

  private loadSubjects(campusCode: string, termCode: string): void {
    this.subjectsLoading.set(true);
    this.catalog.getSubjects(campusCode, termCode).subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.subjectsLoading.set(false);
      },
      error: (err: unknown) => {
        this.subjectsError.set(messageFor(err));
        this.subjectsLoading.set(false);
      },
    });
  }

  toggleSubject(subjectCode: string): void {
    const next = new Set(this.selectedSubjects());
    if (next.has(subjectCode)) next.delete(subjectCode);
    else next.add(subjectCode);
    this.selectedSubjects.set(next);
  }
}

function messageFor(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
}

function sortBy(items: Identifier[], key: (item: Identifier) => string): Identifier[] {
  return [...items].sort((a, b) => key(a).localeCompare(key(b)));
}
