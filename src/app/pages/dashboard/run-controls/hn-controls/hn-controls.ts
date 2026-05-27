import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

const TYPES = [
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'Nuevas' },
  { value: 'best', label: 'Mejores' },
];

@Component({
  selector: 'app-hn-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './hn-controls.html',
  styleUrl: '../run-controls.scss',
})
export class HnControls {
  readonly search = output<RunParams>();

  protected readonly types = TYPES;
  protected readonly type = signal('top');

  protected submit(): void {
    this.search.emit({ query: { type: this.type(), limit: 20 } });
  }
}
