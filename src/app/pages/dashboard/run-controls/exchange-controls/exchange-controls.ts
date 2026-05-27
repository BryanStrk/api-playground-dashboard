import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';
import { RunParams } from '../../../../core/api.service';

interface Currency {
  code: string;
  name: string;
}

const FALLBACK_CURRENCIES: Currency[] = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
];

@Component({
  selector: 'app-exchange-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './exchange-controls.html',
  styleUrls: ['../run-controls.scss', './exchange-controls.scss'],
})
export class ExchangeControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly currencies = signal<Currency[]>(FALLBACK_CURRENCIES);
  protected readonly from = signal('EUR');
  protected readonly to = signal<string[]>(['USD', 'GBP', 'JPY']);
  protected readonly adder = signal<string>('');

  protected readonly available = computed<Currency[]>(() => {
    const chosen = new Set(this.to());
    const fromCode = this.from();
    return this.currencies().filter((c) => !chosen.has(c.code) && c.code !== fromCode);
  });

  protected readonly canRemove = computed(() => this.to().length > 1);

  constructor() {
    this.loadCurrencies();
  }

  protected submit(): void {
    const destinations = this.to();
    if (destinations.length === 0) return;
    this.search.emit({
      query: { from: this.from(), to: destinations.join(',') },
    });
  }

  protected onFromChange(value: string): void {
    this.from.set(value);
    this.to.set(this.to().filter((c) => c !== value));
    this.submit();
  }

  protected onAdderChange(value: string): void {
    if (!value) return;
    if (!this.to().includes(value)) {
      this.to.set([...this.to(), value]);
      this.submit();
    }
    this.adder.set('');
  }

  protected remove(code: string): void {
    if (!this.canRemove()) return;
    this.to.set(this.to().filter((c) => c !== code));
    this.submit();
  }

  private loadCurrencies(): void {
    this.http
      .get<Currency[]>(`${environment.apiBaseUrl}/exchange/currencies`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          if (!Array.isArray(list) || list.length === 0) return;
          this.currencies.set(
            list
              .filter((c) => !!c?.code && !!c?.name)
              .sort((a, b) => a.code.localeCompare(b.code)),
          );
        },
      });
  }
}
