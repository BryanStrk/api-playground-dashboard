import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

const COUNTRIES = [
  { code: 'us', label: 'Estados Unidos' },
  { code: 'gb', label: 'Reino Unido' },
  { code: 'es', label: 'España' },
  { code: 'fr', label: 'Francia' },
  { code: 'de', label: 'Alemania' },
  { code: 'it', label: 'Italia' },
  { code: 'mx', label: 'México' },
  { code: 'ar', label: 'Argentina' },
  { code: 'br', label: 'Brasil' },
  { code: 'jp', label: 'Japón' },
];

const CATEGORIES = [
  { value: '', label: 'Todas' },
  { value: 'business', label: 'Negocios' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'general', label: 'General' },
  { value: 'health', label: 'Salud' },
  { value: 'science', label: 'Ciencia' },
  { value: 'sports', label: 'Deportes' },
  { value: 'technology', label: 'Tecnología' },
];

@Component({
  selector: 'app-news-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './news-controls.html',
  styleUrl: '../run-controls.scss',
})
export class NewsControls {
  readonly search = output<RunParams>();

  protected readonly countries = COUNTRIES;
  protected readonly categories = CATEGORIES;

  protected readonly country = signal('us');
  protected readonly category = signal('');

  protected submit(): void {
    this.search.emit({
      query: {
        country: this.country(),
        category: this.category() || null,
      },
    });
  }

  protected onChange(): void {
    this.submit();
  }
}
