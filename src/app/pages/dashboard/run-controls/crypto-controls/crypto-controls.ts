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
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { RunParams } from '../../../../core/api.service';

interface CoinSummary {
  id: string;
  name: string;
  symbol: string;
  thumb: string | null;
}

const DEFAULT_COINS: CoinSummary[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', thumb: null },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', thumb: null },
];

const VS_OPTIONS = ['eur', 'usd', 'gbp', 'jpy'];

@Component({
  selector: 'app-crypto-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './crypto-controls.html',
  styleUrls: ['../run-controls.scss', './crypto-controls.scss'],
})
export class CryptoControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly query$ = new Subject<string>();

  readonly search = output<RunParams>();

  protected readonly vsOptions = VS_OPTIONS;
  protected readonly query = signal('');
  protected readonly suggestions = signal<CoinSummary[]>([]);
  protected readonly chosen = signal<CoinSummary[]>(DEFAULT_COINS);
  protected readonly vs = signal('eur');
  protected readonly searching = signal(false);

  protected readonly canRemove = computed(() => this.chosen().length > 1);

  constructor() {
    this.query$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          const term = q.trim();
          if (term.length < 2) {
            this.suggestions.set([]);
            this.searching.set(false);
            return [];
          }
          this.searching.set(true);
          return this.http.get<CoinSummary[]>(
            `${environment.apiBaseUrl}/crypto/search`,
            { params: { q: term } },
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (list) => {
          const chosenIds = new Set(this.chosen().map((c) => c.id));
          this.suggestions.set(
            (list ?? [])
              .filter((c) => !!c?.id && !chosenIds.has(c.id))
              .slice(0, 8),
          );
          this.searching.set(false);
        },
        error: () => {
          this.suggestions.set([]);
          this.searching.set(false);
        },
      });
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    this.query$.next(value);
  }

  protected add(coin: CoinSummary): void {
    const current = this.chosen();
    if (current.some((c) => c.id === coin.id)) return;
    this.chosen.set([...current, coin]);
    this.suggestions.set(this.suggestions().filter((c) => c.id !== coin.id));
    this.query.set('');
    this.emit();
  }

  protected remove(id: string): void {
    if (!this.canRemove()) return;
    this.chosen.set(this.chosen().filter((c) => c.id !== id));
    this.emit();
  }

  protected onVsChange(value: string): void {
    this.vs.set(value);
    this.emit();
  }

  protected submit(): void {
    this.emit();
  }

  private emit(): void {
    const ids = this.chosen().map((c) => c.id).join(',');
    if (!ids) return;
    this.search.emit({ query: { ids, vs: this.vs() } });
  }
}
