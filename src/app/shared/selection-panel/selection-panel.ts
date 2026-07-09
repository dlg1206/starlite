import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SelectionStore } from '../../core/state/selection.store';

@Component({
  selector: 'app-selection-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './selection-panel.html',
  styleUrl: './selection-panel.scss',
})
export class SelectionPanel {
  protected readonly store = inject(SelectionStore);
  protected readonly subjectFilter = signal('');

  protected readonly filteredSubjects = () => {
    const query = this.subjectFilter().trim().toLowerCase();
    const subjects = this.store.subjects();
    if (!query) return subjects;
    return subjects.filter(
      (s) => s.id.toLowerCase().includes(query) || s.value.toLowerCase().includes(query),
    );
  };

  onCampusChange(value: string): void {
    this.store.selectCampus(value || null);
  }

  onTermChange(value: string): void {
    this.store.selectTerm(value || null);
  }

  isSubjectSelected(code: string): boolean {
    return this.store.selectedSubjects().has(code);
  }
}
