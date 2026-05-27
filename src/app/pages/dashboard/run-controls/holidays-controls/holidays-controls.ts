import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';
import { RunParams } from '../../../../core/api.service';

interface Country {
  code: string;
  name: string;
}

const FALLBACK_COUNTRIES: Country[] = [
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

@Component({
  selector: 'app-holidays-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './holidays-controls.html',
  styleUrl: '../run-controls.scss',
})
export class HolidaysControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly countries = signal<Country[]>(FALLBACK_COUNTRIES);
  protected readonly years = YEARS;
  protected readonly country = signal('ES');
  protected readonly year = signal<number>(CURRENT_YEAR);

  constructor() {
    this.loadCountries();
  }

  protected submit(): void {
    this.search.emit({
      query: { country: this.country(), year: this.year() },
    });
  }

  private loadCountries(): void {
    this.http
      .get<Country[]>(`${environment.apiBaseUrl}/holidays/countries`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          if (!Array.isArray(list) || list.length === 0) return;
          this.countries.set(
            list
              .filter((c) => !!c?.code && !!c?.name)
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        },
      });
  }
}
