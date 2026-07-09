import { Component, computed, input } from '@angular/core';

import { Day } from '../../core/models/catalog.model';
import { ScheduledCourse } from '../../core/models/schedule.model';
import { dayLabel, formatHHmm } from '../format-time';

const GRID_START_MIN = 7 * 60; // 7:00 AM
const GRID_END_MIN = 22 * 60; // 10:00 PM
const GRID_DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const COLORS = [
  '#0b5fff',
  '#0f9d58',
  '#d97706',
  '#c2255c',
  '#7c3aed',
  '#0891b2',
  '#b91c1c',
  '#4d7c0f',
];

interface GridBlock {
  courseLabel: string;
  sectionLabel: string;
  timeLabel: string;
  color: string;
  top: number;
  height: number;
}

interface UnscheduledItem {
  courseLabel: string;
  reason: string;
}

@Component({
  selector: 'app-schedule-grid',
  standalone: true,
  templateUrl: './schedule-grid.html',
  styleUrl: './schedule-grid.scss',
})
export class ScheduleGrid {
  readonly courses = input.required<ScheduledCourse[]>();

  protected readonly days = GRID_DAYS;
  protected readonly hourMarks = computed(() => {
    const marks: string[] = [];
    for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) marks.push(formatHHmm(minutesToHHmm(m)));
    return marks;
  });

  protected readonly blocksByDay = computed<Record<Day, GridBlock[]>>(() => {
    const byDay = Object.fromEntries(GRID_DAYS.map((d) => [d, [] as GridBlock[]])) as Record<
      Day,
      GridBlock[]
    >;
    const totalSpan = GRID_END_MIN - GRID_START_MIN;

    this.courses().forEach((sc, index) => {
      const color = COLORS[index % COLORS.length];
      const courseLabel = `${sc.subject_code} ${sc.course_number}`;
      for (const meeting of sc.section.meetings) {
        if (!meeting.start_time || !meeting.end_time || !(meeting.day in byDay)) continue;
        const start = hhmmToMinutes(meeting.start_time);
        const end = hhmmToMinutes(meeting.end_time);
        const clampedStart = Math.max(start, GRID_START_MIN);
        const clampedEnd = Math.min(end, GRID_END_MIN);
        if (clampedEnd <= clampedStart) continue;

        byDay[meeting.day].push({
          courseLabel,
          sectionLabel: `Sec ${sc.section.section_number}`,
          timeLabel: `${formatHHmm(meeting.start_time)} – ${formatHHmm(meeting.end_time)}`,
          color,
          top: ((clampedStart - GRID_START_MIN) / totalSpan) * 100,
          height: ((clampedEnd - clampedStart) / totalSpan) * 100,
        });
      }
    });

    return byDay;
  });

  protected readonly unscheduled = computed<UnscheduledItem[]>(() =>
    this.courses()
      .filter((sc) => !sc.section.meetings.some((m) => m.start_time && m.end_time))
      .map((sc) => ({
        courseLabel: `${sc.subject_code} ${sc.course_number} · Sec ${sc.section.section_number}`,
        reason: sc.section.format === 'ONLINE' ? 'Online / async, no fixed meeting time' : 'TBA',
      })),
  );

  protected dayLabel = dayLabel;
}

function hhmmToMinutes(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(2, 4));
}

function minutesToHHmm(value: number): string {
  const hh = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const mm = (value % 60).toString().padStart(2, '0');
  return `${hh}${mm}`;
}
