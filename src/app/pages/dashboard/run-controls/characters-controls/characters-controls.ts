import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

@Component({
  selector: 'app-characters-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './characters-controls.html',
  styleUrl: '../run-controls.scss',
})
export class CharactersControls {
  readonly search = output<RunParams>();

  protected readonly name = signal('rick');

  protected submit(): void {
    const value = this.name().trim();
    if (!value) return;
    this.search.emit({
      endpoint: '/api/v1/characters/search',
      query: { name: value },
    });
  }
}
