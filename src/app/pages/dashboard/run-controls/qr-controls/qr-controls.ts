import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

const SIZES = ['150x150', '300x300', '500x500', '800x800'];

@Component({
  selector: 'app-qr-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './qr-controls.html',
  styleUrl: '../run-controls.scss',
})
export class QrControls {
  readonly search = output<RunParams>();

  protected readonly sizes = SIZES;
  protected readonly data = signal('https://github.com');
  protected readonly size = signal('300x300');

  protected submit(): void {
    const value = this.data().trim();
    if (!value) return;
    this.search.emit({ query: { data: value, size: this.size() } });
  }
}
