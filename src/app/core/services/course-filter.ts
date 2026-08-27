import { Day, DetailedCourse, Meeting, Section } from '../models/catalog.model';
import { CourseFilterRequest } from '../models/course-filter.model';

const AUDIT_GRADING_OPTION = 'Audit';

interface RegexRule {
  accept: RegExp | null;
  reject: RegExp | null;
}

interface MeetingFilterState {
  skip: boolean;
  acceptDays: Set<Day> | null;
  rejectDays: Set<Day> | null;
  startAfterMin: number | null;
  endBeforeMin: number | null;
  onlyOnline: boolean | null;
  onlyAsync: boolean | null;
}

interface SectionFilterState {
  skip: boolean;
  meeting: MeetingFilterState;
  acceptCrns: Set<number> | null;
  rejectCrns: Set<number> | null;
  acceptInstructors: Set<string> | null;
  rejectInstructors: Set<string> | null;
  excludeFull: boolean;
  excludeWaitlisted: boolean;
}

interface CourseFilterState {
  skip: boolean;
  hasMajorRestriction: boolean | null;
  hasPrereq: boolean | null;
  canAudit: boolean | null;
  courseNumberRule: RegexRule | null;
  courseIdRule: RegexRule | null;
  titleRule: RegexRule | null;
  descRule: RegexRule | null;
}

/**
 * Mirrors api/src/main/java/com/uh/starlite/filter/CourseFilter.java so the advanced filter can
 * run entirely client-side against already-fetched courses instead of round-tripping through the
 * filter API endpoint. Keep this in sync with that file if its rules change.
 */
export function applyCourseFilter(
  courses: DetailedCourse[],
  filter: CourseFilterRequest,
): DetailedCourse[] {
  const courseState = buildCourseFilterState(filter);
  const sectionState = buildSectionFilterState(filter);

  const result: DetailedCourse[] = [];
  for (const course of courses) {
    if (rejectCourse(courseState, course)) continue;
    const sections = course.sections.filter((section) => !rejectSection(sectionState, section));
    if (sections.length > 0) result.push({ ...course, sections });
  }
  return result;
}

function rejectCourse(state: CourseFilterState, course: DetailedCourse): boolean {
  if (state.skip) return false;

  if (state.hasMajorRestriction !== null && course.major_restriction !== state.hasMajorRestriction) {
    return true;
  }
  if (state.hasPrereq !== null && hasPrerequisite(course) !== state.hasPrereq) return true;
  if (state.canAudit !== null && canAudit(course) !== state.canAudit) return true;
  if (state.courseNumberRule && regexRejects(state.courseNumberRule, course.course_number)) return true;
  if (state.courseIdRule && regexRejects(state.courseIdRule, courseIdString(course))) return true;
  if (state.titleRule && regexRejects(state.titleRule, course.name)) return true;
  return !!state.descRule && regexRejects(state.descRule, course.description);
}

function rejectSection(state: SectionFilterState, section: Section): boolean {
  if (state.skip && state.meeting.skip) return false;

  if (state.excludeFull && isSectionFull(section)) return true;
  if (state.excludeWaitlisted && isSectionWaitlisted(section)) return true;
  if (state.acceptCrns && !state.acceptCrns.has(section.crn)) return true;
  if (state.rejectCrns && state.rejectCrns.has(section.crn)) return true;

  const username = section.instructor?.username.toLowerCase() ?? null;
  if (state.acceptInstructors && (username === null || !state.acceptInstructors.has(username))) {
    return true;
  }
  if (state.rejectInstructors && username !== null && state.rejectInstructors.has(username)) {
    return true;
  }

  // A section with no meetings is a fully online/async section - the API strips its placeholder
  // meeting before serialization, but still treats the section as async for `only_async`. Other
  // meeting-based filters (days, times, only_online) don't apply since there's no meeting data.
  if (section.meetings.length === 0) {
    return state.meeting.onlyAsync !== null && state.meeting.onlyAsync !== true;
  }

  return !state.meeting.skip && section.meetings.some((meeting) => rejectMeeting(state.meeting, meeting));
}

function rejectMeeting(state: MeetingFilterState, meeting: Meeting): boolean {
  if (state.skip) return false;

  if (state.onlyOnline !== null && isOnlineMeeting(meeting) !== state.onlyOnline) return true;
  if (state.onlyAsync !== null && isAsyncMeeting(meeting) !== state.onlyAsync) return true;
  if (state.acceptDays && !state.acceptDays.has(meeting.day)) return true;
  if (state.rejectDays && state.rejectDays.has(meeting.day)) return true;
  if (state.startAfterMin !== null && meeting.start_time !== null) {
    if (parseHHmm(meeting.start_time) < state.startAfterMin) return true;
  }
  if (state.endBeforeMin !== null && meeting.end_time !== null) {
    if (parseHHmm(meeting.end_time) > state.endBeforeMin) return true;
  }
  return false;
}

function hasPrerequisite(course: DetailedCourse): boolean {
  return !!course.prereq_description && course.prereq_description.length > 0;
}

function canAudit(course: DetailedCourse): boolean {
  return course.grading_options.includes(AUDIT_GRADING_OPTION);
}

function courseIdString(course: DetailedCourse): string {
  return `${course.subject_code} ${course.course_number}`;
}

/** The API nulls a meeting's building code once it determines the meeting is online. */
function isOnlineMeeting(meeting: Meeting): boolean {
  return meeting.building_code === null;
}

/** The API nulls a meeting's room code once it determines the meeting is async. */
function isAsyncMeeting(meeting: Meeting): boolean {
  return meeting.room_code === null;
}

function isSectionFull(section: Section): boolean {
  return section.cur_enrolled >= section.max_enrolled && section.cur_waitlist >= section.max_waitlist;
}

function isSectionWaitlisted(section: Section): boolean {
  return section.cur_enrolled >= section.max_enrolled && section.cur_waitlist < section.max_waitlist;
}

function buildCourseFilterState(filter: CourseFilterRequest): CourseFilterState {
  const courseNumberRule = buildWildcardRule(filter.accept_course_numbers, filter.reject_course_numbers);
  const courseIdRule = buildWildcardRule(filter.accept_course_ids, filter.reject_course_ids);
  const titleRule = buildRegexRule(filter.accept_title_keywords, filter.reject_title_keywords);
  const descRule = buildRegexRule(filter.accept_desc_keywords, filter.reject_desc_keywords);

  return {
    skip:
      !courseNumberRule &&
      !courseIdRule &&
      !titleRule &&
      !descRule &&
      filter.has_prereq == null &&
      filter.can_audit == null &&
      filter.has_major_restriction == null,
    hasMajorRestriction: filter.has_major_restriction ?? null,
    hasPrereq: filter.has_prereq ?? null,
    canAudit: filter.can_audit ?? null,
    courseNumberRule,
    courseIdRule,
    titleRule,
    descRule,
  };
}

function buildSectionFilterState(filter: CourseFilterRequest): SectionFilterState {
  const acceptCrns = toSet(filter.accept_crns);
  const rejectCrns = toSet(filter.reject_crns);
  const acceptInstructors = toSet(filter.accept_instructors?.map((i) => i.toLowerCase()));
  const rejectInstructors = toSet(filter.reject_instructors?.map((i) => i.toLowerCase()));
  const excludeFull = filter.exclude_full === true;
  const excludeWaitlisted = filter.exclude_waitlisted === true;
  const meeting = buildMeetingFilterState(filter);

  return {
    skip:
      !acceptCrns &&
      !rejectCrns &&
      !acceptInstructors &&
      !rejectInstructors &&
      filter.exclude_full == null &&
      filter.exclude_waitlisted == null,
    meeting,
    acceptCrns,
    rejectCrns,
    acceptInstructors,
    rejectInstructors,
    excludeFull,
    excludeWaitlisted,
  };
}

function buildMeetingFilterState(filter: CourseFilterRequest): MeetingFilterState {
  const acceptDays = toSet(filter.accept_days);
  const rejectDays = toSet(filter.reject_days);
  const startAfterMin = filter.start_after ? parseHHColonMM(filter.start_after) : null;
  const endBeforeMin = filter.end_before ? parseHHColonMM(filter.end_before) : null;
  const onlyOnline = filter.only_online ?? null;
  const onlyAsync = filter.only_async ?? null;

  return {
    skip:
      !acceptDays &&
      !rejectDays &&
      startAfterMin === null &&
      endBeforeMin === null &&
      onlyOnline === null &&
      onlyAsync === null,
    acceptDays,
    rejectDays,
    startAfterMin,
    endBeforeMin,
    onlyOnline,
    onlyAsync,
  };
}

function toSet<T>(values: T[] | undefined): Set<T> | null {
  return values && values.length > 0 ? new Set(values) : null;
}

/** '*' -> any digit, '**' -> any two digits, matching CourseFilter.Builder#formatCourseIDRegex. */
function formatWildcardPattern(pattern: string): string {
  return pattern.trim().replace(/\*\*/g, '\\d{2}').replace(/\*/g, '\\d');
}

function buildWildcardRule(
  accept: string[] | undefined,
  reject: string[] | undefined,
): RegexRule | null {
  if (accept === undefined && reject === undefined) return null;
  return buildRegexRule(accept?.map(formatWildcardPattern), reject?.map(formatWildcardPattern));
}

/** Joins patterns into a single case-insensitive regex, matching RegexFilter.java. */
function buildRegexRule(accept: string[] | undefined, reject: string[] | undefined): RegexRule | null {
  if (accept === undefined && reject === undefined) return null;
  return {
    accept: accept && accept.length > 0 ? new RegExp(accept.join('|'), 'i') : null,
    reject: reject && reject.length > 0 ? new RegExp(reject.join('|'), 'i') : null,
  };
}

/** String must match the accept pattern (if set) and must not match the reject pattern (if set). */
function regexRejects(rule: RegexRule, value: string): boolean {
  if (rule.accept && !rule.accept.test(value)) return true;
  return !!rule.reject && rule.reject.test(value);
}

/** "HHmm" (meeting times) -> minutes since midnight. */
function parseHHmm(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(2, 4));
}

/** "HH:mm" (filter input) -> minutes since midnight. */
function parseHHColonMM(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
