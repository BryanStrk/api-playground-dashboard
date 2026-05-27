import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { ApiInfo, RunResult } from '../../../core/models';
import { AudioResult } from '../result-views/audio-result/audio-result';
import { GalleryResult } from '../result-views/gallery-result/gallery-result';
import { MediaResult } from '../result-views/media-result/media-result';
import { StatResult } from '../result-views/stat-result/stat-result';
import { TextResult } from '../result-views/text-result/text-result';
import { ResultViewType, viewTypeFor } from '../result-views/view-type';

@Component({
  selector: 'app-run-offcanvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AudioResult, GalleryResult, MediaResult, StatResult, TextResult],
  templateUrl: './run-offcanvas.html',
  styleUrl: './run-offcanvas.scss',
})
export class RunOffcanvas {
  readonly api = input<ApiInfo | null>(null);
  readonly result = input<RunResult | null>(null);
  readonly loading = input<boolean>(false);

  protected readonly prettyJson = computed(() => {
    const data = this.result()?.data;
    if (data === null || data === undefined) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  });

  protected readonly statusTone = computed(() => {
    const r = this.result();
    if (!r) return 'text-bg-secondary';
    if (!r.ok) return 'text-bg-danger';
    if (r.httpStatus >= 200 && r.httpStatus < 300) return 'text-bg-success';
    return 'text-bg-warning';
  });

  protected readonly viewType = computed<ResultViewType>(() => viewTypeFor(this.api()?.id));

  protected readonly tab = signal<'view' | 'json'>('view');
  protected readonly hasRichView = computed(() => this.viewType() !== 'RAW');

  constructor() {
    effect(() => {
      this.api();
      this.tab.set('view');
    });
  }

  protected selectTab(tab: 'view' | 'json'): void {
    this.tab.set(tab);
  }
}
