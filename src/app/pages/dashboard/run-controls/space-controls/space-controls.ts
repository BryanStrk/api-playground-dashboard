import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

@Component({
  selector: 'app-space-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './space-controls.html',
  styleUrl: '../run-controls.scss',
})
export class SpaceControls {
  readonly search = output<RunParams>();

  protected readonly maxDate = isoToday();
  protected readonly date = signal(this.maxDate);

  protected submit(): void {
    const value = this.date().trim();
    if (!value) return;
    this.search.emit({ query: { date: value } });
  }

  protected random(): void {
    this.search.emit({ query: { random: true } });
  }
}

function isoToday(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
