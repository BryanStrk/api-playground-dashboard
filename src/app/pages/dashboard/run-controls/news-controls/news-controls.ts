import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'Inglés' },
  { code: 'fr', label: 'Francés' },
  { code: 'de', label: 'Alemán' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Portugués' },
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

  protected readonly languages = LANGUAGES;
  protected readonly query = signal('mundo');
  protected readonly language = signal('es');

  protected submit(): void {
    const q = this.query().trim();
    this.search.emit({
      query: {
        q: q || null,
        language: this.language(),
      },
    });
  }
}
