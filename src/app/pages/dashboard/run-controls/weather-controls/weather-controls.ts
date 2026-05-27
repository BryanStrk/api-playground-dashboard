import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

@Component({
  selector: 'app-weather-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './weather-controls.html',
  styleUrl: '../run-controls.scss',
})
export class WeatherControls {
  readonly search = output<RunParams>();

  protected readonly city = signal('Madrid');

  protected submit(): void {
    const value = this.city().trim();
    if (!value) return;
    this.search.emit({ query: { city: value } });
  }
}
