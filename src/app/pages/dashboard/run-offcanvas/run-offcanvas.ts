import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApiInfo, RunResult } from '../../../core/models';
import { AudioResult } from '../result-views/audio-result/audio-result';
import { MediaResult } from '../result-views/media-result/media-result';
import { ResultViewType, viewTypeFor } from '../result-views/view-type';

@Component({
  selector: 'app-run-offcanvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AudioResult, MediaResult],
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
}
