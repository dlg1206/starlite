import { Day, Section } from './catalog.model';

export interface RequestedCourse {
  subject_code: string;
  /** Exact course number, wildcards are NOT supported here. */
  number: string;
  /** Restrict to specific CRNs for this course; omit/empty to allow all sections. */
  crns?: number[];
}

export interface ScheduleBlock {
  /** Days the block applies to; omit for every weekday. */
  days?: Day[];
  /** HH:mm 24hr */
  start: string;
  /** HH:mm 24hr */
  end: string;
}

export interface ScheduleRequest {
  courses: RequestedCourse[];
  /** Minimum minutes required between classes and blocks. */
  buffer_time?: number;
  blocks?: ScheduleBlock[];
}

export interface ScheduledCourse {
  subject_code: string;
  course_number: string;
  name: string;
  description: string;
  credits: number;
  section: Section;
}

export interface ScheduleResponse {
  timestamp: string;
  schedules: ScheduledCourse[][];
}
