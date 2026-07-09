import { Component, computed, inject, input } from '@angular/core';

import { CartStore } from '../../core/state/cart.store';
import {
  Course,
  Section,
  SectionFormat,
  isDetailedCourse,
} from '../../core/models/catalog.model';
import { formatMeetingTime } from '../format-time';

@Component({
  selector: 'app-course-card',
  standalone: true,
  templateUrl: './course-card.html',
  styleUrl: './course-card.scss',
})
export class CourseCard {
  private readonly cart = inject(CartStore);

  readonly course = input.required<Course>();

  protected readonly isDetailed = computed(() => isDetailedCourse(this.course()));
  protected readonly sections = computed(() => {
    const course = this.course();
    return isDetailedCourse(course) ? course.sections : [];
  });
  protected readonly numSections = computed(() => {
    const course = this.course();
    return isDetailedCourse(course) ? course.sections.length : course.num_sections;
  });

  protected readonly isAllInCart = computed(() => {
    const course = this.course();
    if (!isDetailedCourse(course) || course.sections.length === 0) return false;
    const selected = this.cart.getSelectedCrns(course.subject_code, course.course_number);
    return course.sections.every((s) => selected.has(s.crn));
  });

  protected readonly formatMeetingTime = formatMeetingTime;

  protected formatLabel(format: SectionFormat | null): string {
    return format ?? 'TBA';
  }

  protected formatClass(format: SectionFormat | null): string {
    return `format-${(format ?? 'tba').toLowerCase()}`;
  }

  protected addAllToCart(): void {
    const course = this.course();
    if (!isDetailedCourse(course)) return;
    this.cart.addAllSections(course);
  }

  protected isSectionInCart(section: Section): boolean {
    const course = this.course();
    return this.cart.getSelectedCrns(course.subject_code, course.course_number).has(section.crn);
  }

  protected toggleSectionInCart(section: Section): void {
    const course = this.course();
    if (!isDetailedCourse(course)) return;
    if (this.isSectionInCart(section)) {
      this.cart.setSectionIncluded(course.subject_code, course.course_number, section.crn, false);
    } else {
      this.cart.addSection(course, section);
    }
  }
}
