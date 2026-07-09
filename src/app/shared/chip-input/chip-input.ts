import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Text field that turns each Enter-confirmed entry into a removable chip. */
@Component({
  selector: 'app-chip-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chip-input.html',
  styleUrl: './chip-input.scss',
})
export class ChipInput {
  readonly placeholder = input('');
  readonly values = model<string[]>([]);

  protected draft = '';

  addFromDraft(): void {
    const value = this.draft.trim();
    this.draft = '';
    if (!value || this.values().includes(value)) return;
    this.values.update((vs) => [...vs, value]);
  }

  remove(value: string): void {
    this.values.update((vs) => vs.filter((v) => v !== value));
  }
}
