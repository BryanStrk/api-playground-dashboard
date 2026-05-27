import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

@Component({
  selector: 'app-photos-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './photos-controls.html',
  styleUrl: '../run-controls.scss',
})
export class PhotosControls {
  readonly search = output<RunParams>();

  protected readonly query = signal('mountains');

  protected submit(): void {
    const value = this.query().trim();
    if (!value) return;
    this.search.emit({ query: { query: value } });
  }
}
