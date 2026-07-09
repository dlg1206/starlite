import { Injectable, computed, signal } from '@angular/core';

import { DetailedCourse, Section } from '../models/catalog.model';
import { RequestedCourse } from '../models/schedule.model';

export interface CartSectionOption {
  crn: number;
  sectionNumber: string;
}

export interface CartItem {
  subjectCode: string;
  courseNumber: string;
  name: string;
  credits: number;
  /** Every section ever added for this course (union across searches). */
  sections: CartSectionOption[];
  /** Subset of `sections` crns actually included when generating a schedule. */
  selectedCrns: Set<number>;
}

/**
 * Courses/sections a user has added while searching, carried over to the
 * schedule builder. Selecting fewer than all known sections for a course
 * restricts that course to just those CRNs when generating schedules.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly itemsMap = signal<Map<string, CartItem>>(new Map());

  readonly items = computed(() => Array.from(this.itemsMap().values()));
  readonly isEmpty = computed(() => this.itemsMap().size === 0);
  readonly count = computed(() => this.itemsMap().size);

  addAllSections(course: DetailedCourse): void {
    this.upsert(course, course.sections, course.sections.map((s) => s.crn));
  }

  addSection(course: DetailedCourse, section: Section): void {
    this.upsert(course, [section], [section.crn]);
  }

  setSectionIncluded(
    subjectCode: string,
    courseNumber: string,
    crn: number,
    included: boolean,
  ): void {
    const key = cartKey(subjectCode, courseNumber);
    const map = new Map(this.itemsMap());
    const item = map.get(key);
    if (!item) return;

    const selectedCrns = new Set(item.selectedCrns);
    if (included) selectedCrns.add(crn);
    else selectedCrns.delete(crn);

    if (selectedCrns.size === 0) map.delete(key);
    else map.set(key, { ...item, selectedCrns });
    this.itemsMap.set(map);
  }

  removeCourse(subjectCode: string, courseNumber: string): void {
    const map = new Map(this.itemsMap());
    map.delete(cartKey(subjectCode, courseNumber));
    this.itemsMap.set(map);
  }

  getSelectedCrns(subjectCode: string, courseNumber: string): Set<number> {
    return this.itemsMap().get(cartKey(subjectCode, courseNumber))?.selectedCrns ?? new Set();
  }

  clear(): void {
    this.itemsMap.set(new Map());
  }

  toRequestedCourses(): RequestedCourse[] {
    return this.items().map((item) => ({
      subject_code: item.subjectCode,
      number: item.courseNumber,
      crns:
        item.selectedCrns.size < item.sections.length
          ? Array.from(item.selectedCrns)
          : undefined,
    }));
  }

  private upsert(course: DetailedCourse, sectionsToAdd: Section[], crnsToSelect: number[]): void {
    const key = cartKey(course.subject_code, course.course_number);
    const map = new Map(this.itemsMap());
    const existing = map.get(key);

    const sections: CartSectionOption[] = existing ? [...existing.sections] : [];
    for (const section of sectionsToAdd) {
      if (!sections.some((s) => s.crn === section.crn)) {
        sections.push({ crn: section.crn, sectionNumber: section.section_number });
      }
    }

    const selectedCrns = new Set(existing?.selectedCrns ?? []);
    crnsToSelect.forEach((crn) => selectedCrns.add(crn));

    map.set(key, {
      subjectCode: course.subject_code,
      courseNumber: course.course_number,
      name: course.name,
      credits: course.credits,
      sections,
      selectedCrns,
    });
    this.itemsMap.set(map);
  }
}

function cartKey(subjectCode: string, courseNumber: string): string {
  return `${subjectCode}::${courseNumber}`;
}
