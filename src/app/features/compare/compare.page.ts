import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ScheduleService } from '../../core/services/schedule.service';
import { CompareStore } from '../../core/state/compare.store';
import { ApiError } from '../../core/models/api-error.model';
import { Schedule } from '../../core/models/schedule.model';
import { ScheduleGrid } from '../../shared/schedule-grid/schedule-grid';
import { ScheduleDetailList } from '../../shared/schedule-detail-list/schedule-detail-list';
import { triggerDownload } from '../../shared/download';

@Component({
  selector: 'app-compare-page',
  standalone: true,
  imports: [FormsModule, ScheduleGrid, ScheduleDetailList],
  templateUrl: './compare.page.html',
  styleUrl: './compare.page.scss',
})
export class ComparePage {
  protected readonly compare = inject(CompareStore);
  private readonly scheduler = inject(ScheduleService);

  protected idInput = '';
  protected readonly addingById = signal(false);
  protected readonly addError = signal<string | null>(null);
  protected readonly exportingId = signal<string | null>(null);
  protected readonly exportError = signal<string | null>(null);
  protected readonly copiedId = signal<string | null>(null);

  addById(): void {
    const id = this.idInput.trim();
    if (!id || this.addingById()) return;

    this.addError.set(null);
    if (this.compare.has(id)) {
      this.addError.set('That schedule is already in your comparison.');
      return;
    }

    this.addingById.set(true);
    this.scheduler.getScheduleById(id).subscribe({
      next: (schedule) => {
        this.compare.add(id, schedule);
        this.idInput = '';
        this.addingById.set(false);
      },
      error: (err: unknown) => {
        this.addError.set(
          err instanceof ApiError ? err.message : 'Failed to look up that schedule ID.',
        );
        this.addingById.set(false);
      },
    });
  }

  exportIcs(id: string, schedule: Schedule): void {
    if (this.exportingId()) return;

    this.exportError.set(null);
    this.exportingId.set(id);
    this.scheduler.downloadIcs(schedule.ics_url).subscribe({
      next: ({ blob, filename }) => {
        triggerDownload(blob, filename);
        this.exportingId.set(null);
      },
      error: (err: unknown) => {
        this.exportError.set(
          err instanceof ApiError ? err.message : 'Failed to export schedule as .ics.',
        );
        this.exportingId.set(null);
      },
    });
  }

  copyId(id: string): void {
    navigator.clipboard.writeText(id).then(() => {
      this.copiedId.set(id);
      setTimeout(() => {
        if (this.copiedId() === id) this.copiedId.set(null);
      }, 1500);
    });
  }
}
