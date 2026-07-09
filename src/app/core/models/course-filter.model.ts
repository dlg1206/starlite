import { Day } from './catalog.model';

/**
 * Optional filter body for the "Filter Courses" endpoints (single & multiple subject).
 * All fields are optional; every field is a "narrow the result set" filter.
 */
export interface CourseFilterRequest {
  accept_crns?: number[];
  reject_crns?: number[];
  accept_course_numbers?: string[];
  reject_course_numbers?: string[];
  accept_course_ids?: string[];
  reject_course_ids?: string[];
  accept_days?: Day[];
  reject_days?: Day[];
  /** HH:mm 24hr */
  start_after?: string;
  /** HH:mm 24hr */
  end_before?: string;
  only_online?: boolean;
  only_async?: boolean;
  has_major_restriction?: boolean;
  has_prereq?: boolean;
  can_audit?: boolean;
  exclude_full?: boolean;
  exclude_waitlisted?: boolean;
  accept_instructors?: string[];
  reject_instructors?: string[];
  accept_title_keywords?: string[];
  reject_title_keywords?: string[];
  accept_desc_keywords?: string[];
  reject_desc_keywords?: string[];
}
