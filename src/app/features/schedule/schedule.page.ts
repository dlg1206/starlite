import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ScheduleService } from '../../core/services/schedule.service';
import { SelectionStore } from '../../core/state/selection.store';
import { CartStore } from '../../core/state/cart.store';
import { ApiError } from '../../core/models/api-error.model';
import { Day, WEEKDAYS } from '../../core/models/catalog.model';
import { ScheduleBlock, ScheduledCourse } from '../../core/models/schedule.model';
import { ScheduleGrid } from '../../shared/schedule-grid/schedule-grid';

interface BlockRow {
  id: number;
  days: Set<Day>;
  start: string;
  end: string;
}

let nextId = 1;

@Component({
  selector: 'app-schedule-page',
  standalone: true,
  imports: [FormsModule, ScheduleGrid],
  templateUrl: './schedule.page.html',
  styleUrl: './schedule.page.scss',
})
export class SchedulePage {
  protected readonly store = inject(SelectionStore);
  protected readonly cart = inject(CartStore);
  private readonly scheduler = inject(ScheduleService);

  protected readonly weekdays = WEEKDAYS;

  protected readonly campusName = computed(
    () => this.store.campuses().find((c) => c.id === this.store.selectedCampus())?.value ?? '',
  );
  protected readonly termName = computed(
    () => this.store.terms().find((t) => t.id === this.store.selectedTerm())?.value ?? '',
  );
  protected readonly canGenerate = computed(
    () => !!this.store.selectedCampus() && !!this.store.selectedTerm() && !this.cart.isEmpty(),
  );

  protected readonly blocks = signal<BlockRow[]>([]);
  protected readonly bufferTime = signal<number | null>(null);

  protected newBlockStart = '';
  protected newBlockEnd = '';
  protected readonly newBlockDays = signal<Set<Day>>(new Set());

  protected readonly schedules = signal<ScheduledCourse[][] | null>(null);
  protected readonly currentIndex = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly scheduleCount = computed(() => this.schedules()?.length ?? 0);
  protected readonly currentSchedule = computed<ScheduledCourse[]>(() => {
    const all = this.schedules();
    if (!all || all.length === 0) return [];
    return all[Math.min(this.currentIndex(), all.length - 1)];
  });

  toggleSectionIncluded(subjectCode: string, courseNumber: string, crn: number, included: boolean): void {
    this.cart.setSectionIncluded(subjectCode, courseNumber, crn, included);
  }

  onBufferTimeChange(value: number | string | null): void {
    if (value === '' || value === null) {
      this.bufferTime.set(null);
      return;
    }
    const minutes = Number(value);
    this.bufferTime.set(Number.isNaN(minutes) ? null : Math.max(0, minutes));
  }

  toggleNewBlockDay(day: Day): void {
    const next = new Set(this.newBlockDays());
    if (next.has(day)) next.delete(day);
    else next.add(day);
    this.newBlockDays.set(next);
  }

  addBlock(): void {
    if (!this.newBlockStart || !this.newBlockEnd) return;
    this.blocks.update((rows) => [
      ...rows,
      {
        id: nextId++,
        days: new Set(this.newBlockDays()),
        start: this.newBlockStart,
        end: this.newBlockEnd,
      },
    ]);
    this.newBlockStart = '';
    this.newBlockEnd = '';
    this.newBlockDays.set(new Set());
  }

  removeBlock(id: number): void {
    this.blocks.update((rows) => rows.filter((r) => r.id !== id));
  }

  daysLabel(block: BlockRow): string {
    return block.days.size ? Array.from(block.days).join(', ') : 'Every day';
  }

  formatLabel(sc: ScheduledCourse): string {
    return sc.section.format ?? 'TBA';
  }

  generate(): void {
    const campus = this.store.selectedCampus();
    const term = this.store.selectedTerm();
    if (!campus || !term || this.cart.isEmpty()) return;

    this.loading.set(true);
    this.error.set(null);
    this.schedules.set(null);
    this.currentIndex.set(0);

    const blocks: ScheduleBlock[] = this.blocks().map((b) => ({
      days: b.days.size ? Array.from(b.days) : undefined,
      start: b.start,
      end: b.end,
    }));

    this.scheduler
      .generateSchedules(campus, term, {
        courses: this.cart.toRequestedCourses(),
        buffer_time: this.bufferTime() ?? undefined,
        blocks: blocks.length ? blocks : undefined,
      })
      .subscribe({
        next: (schedules) => {
          this.schedules.set(schedules);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(err instanceof ApiError ? err.message : 'Failed to generate schedules.');
          this.loading.set(false);
        },
      });
  }

  prevSchedule(): void {
    this.currentIndex.update((i) => Math.max(0, i - 1));
  }

  nextSchedule(): void {
    this.currentIndex.update((i) => Math.min(this.scheduleCount() - 1, i + 1));
  }
}
