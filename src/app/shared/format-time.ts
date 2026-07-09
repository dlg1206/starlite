import { Day, Meeting } from '../core/models/catalog.model';

const DAY_LABELS: Record<Day, string> = {
  SUN: 'Sun',
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  TBD: 'TBA',
};

export function dayLabel(day: Day): string {
  return DAY_LABELS[day] ?? day;
}

/** Converts a 24hr "HHmm" string (e.g. "0930") into "9:30 AM". */
export function formatHHmm(value: string | null): string {
  if (!value || value.length !== 4) return 'TBA';
  const hour = Number(value.slice(0, 2));
  const minute = value.slice(2, 4);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

export function formatMeetingTime(meeting: Meeting): string {
  if (!meeting.start_time || !meeting.end_time) return `${dayLabel(meeting.day)} · TBA`;
  return `${dayLabel(meeting.day)} · ${formatHHmm(meeting.start_time)} – ${formatHHmm(meeting.end_time)}`;
}

/** Converts "HH:mm" (used in request bodies) from a "HHmm" API value, or passthrough. */
export function toHHColonMM(value: string): string {
  if (value.includes(':')) return value;
  if (value.length !== 4) return value;
  return `${value.slice(0, 2)}:${value.slice(2, 4)}`;
}
