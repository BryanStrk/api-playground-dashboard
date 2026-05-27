import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

type Tab = 'apod' | 'search';

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'apod', label: 'Imagen del día' },
  { id: 'search', label: 'Buscar en NASA' },
];

@Component({
  selector: 'app-space-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './space-controls.html',
  styleUrls: ['../run-controls.scss', './space-controls.scss'],
})
export class SpaceControls {
  readonly search = output<RunParams>();

  protected readonly tabs = TAB_LABELS;
  protected readonly tab = signal<Tab>('apod');

  protected readonly maxDate = isoToday();
  protected readonly date = signal(this.maxDate);
  protected readonly query = signal('mars');

  protected selectTab(tab: Tab): void {
    if (tab === this.tab()) return;
    this.tab.set(tab);
  }

  protected submitApod(): void {
    const value = this.date().trim();
    if (!value) return;
    this.search.emit({
      endpoint: '/api/v1/space/apod',
      query: { date: value },
    });
  }

  protected random(): void {
    this.search.emit({
      endpoint: '/api/v1/space/apod',
      query: { random: true },
    });
  }

  protected submitSearch(): void {
    const value = this.query().trim();
    if (!value) return;
    this.search.emit({
      endpoint: '/api/v1/space/search',
      query: { q: value },
    });
  }
}

function isoToday(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
