import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

const NATIONALITIES = [
  { code: 'es', label: 'España' },
  { code: 'us', label: 'Estados Unidos' },
  { code: 'gb', label: 'Reino Unido' },
  { code: 'fr', label: 'Francia' },
  { code: 'de', label: 'Alemania' },
  { code: 'br', label: 'Brasil' },
  { code: 'au', label: 'Australia' },
  { code: 'ca', label: 'Canadá' },
];

@Component({
  selector: 'app-users-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './users-controls.html',
  styleUrl: '../run-controls.scss',
})
export class UsersControls {
  readonly search = output<RunParams>();

  protected readonly nationalities = NATIONALITIES;
  protected readonly nat = signal('es');

  protected submit(): void {
    this.search.emit({ query: { nat: this.nat() } });
  }
}
