import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

@Component({
  selector: 'app-simple-search-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './simple-search-controls.html',
  styleUrl: '../run-controls.scss',
})
export class SimpleSearchControls {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input<string>('');
  readonly hint = input<string | null>(null);
  readonly initial = input<string>('');
  readonly paramKind = input.required<'path' | 'query'>();
  readonly paramName = input.required<string>();

  readonly search = output<RunParams>();

  protected readonly value = signal('');

  constructor() {
    effect(() => {
      this.value.set(this.initial());
    });
  }

  protected submit(): void {
    const v = this.value().trim();
    if (!v) return;
    const params: RunParams =
      this.paramKind() === 'path'
        ? { path: { [this.paramName()]: v } }
        : { query: { [this.paramName()]: v } };
    this.search.emit(params);
  }
}
