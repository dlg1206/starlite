import { Injectable, computed, signal } from '@angular/core';

import { Schedule } from '../models/schedule.model';

export interface ComparedSchedule {
  id: string;
  schedule: Schedule;
}

/** Schedules the user has chosen to compare, keyed by their base64 schedule id. */
@Injectable({ providedIn: 'root' })
export class CompareStore {
  private readonly schedulesMap = signal<Map<string, Schedule>>(new Map());

  readonly schedules = computed<ComparedSchedule[]>(() =>
    Array.from(this.schedulesMap(), ([id, schedule]) => ({ id, schedule })),
  );
  readonly isEmpty = computed(() => this.schedulesMap().size === 0);
  readonly count = computed(() => this.schedulesMap().size);

  has(id: string): boolean {
    return this.schedulesMap().has(id);
  }

  add(id: string, schedule: Schedule): void {
    if (this.schedulesMap().has(id)) return;
    const map = new Map(this.schedulesMap());
    map.set(id, schedule);
    this.schedulesMap.set(map);
  }

  remove(id: string): void {
    const map = new Map(this.schedulesMap());
    map.delete(id);
    this.schedulesMap.set(map);
  }

  clear(): void {
    this.schedulesMap.set(new Map());
  }
}
