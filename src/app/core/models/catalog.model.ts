/** Day codes as returned/accepted by the API (enum name form). */
export type Day = 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'TBD';

export const WEEKDAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export type SectionFormat = 'ONSITE' | 'ONLINE' | 'HYBRID';

export interface Instructor {
  first_name: string;
  middle_initial: string | null;
  last_name: string;
  username: string;
}

export interface Meeting {
  day: Day;
  /** HHmm 24hr, e.g. "0930". Null when time is TBA. */
  start_time: string | null;
  end_time: string | null;
  building_code: string | null;
  room_code: string | null;
}

export interface Section {
  crn: number;
  section_number: string;
  instructor: Instructor | null;
  format: SectionFormat | null;
  cur_enrolled: number;
  max_enrolled: number;
  cur_waitlist: number;
  max_waitlist: number;
  attributes: string[];
  descriptions: string[];
  notes: string[];
  meetings: Meeting[];
}

/** Fields shared by both the simple (?detailed=false) and detailed course shapes. */
export interface CourseBase {
  subject_code: string;
  course_number: string;
  name: string;
  description: string;
  prereq_description: string | null;
  credits: number;
  grading_options: string[];
  major_restriction: boolean;
  approval_authority: string | null;
  start_date: string;
  end_date: string;
}

/** Returned when a course search is made without ?detailed=true. */
export interface SimpleCourse extends CourseBase {
  num_sections: number;
}

/** Returned when a course search is made with ?detailed=true. */
export interface DetailedCourse extends CourseBase {
  sections: Section[];
}

export type Course = SimpleCourse | DetailedCourse;

export function isDetailedCourse(course: Course): course is DetailedCourse {
  return (course as DetailedCourse).sections !== undefined;
}

export interface CourseResponse {
  timestamp: string;
  courses: Course[];
}
