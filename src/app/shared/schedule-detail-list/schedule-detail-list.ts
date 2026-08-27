import { Component, input } from '@angular/core';

import { ScheduledCourse } from '../../core/models/schedule.model';

@Component({
  selector: 'app-schedule-detail-list',
  standalone: true,
  templateUrl: './schedule-detail-list.html',
  styleUrl: './schedule-detail-list.scss',
})
export class ScheduleDetailList {
  readonly courses = input.required<ScheduledCourse[]>();

  protected formatLabel(sc: ScheduledCourse): string {
    return sc.section.format ?? 'TBA';
  }
}
