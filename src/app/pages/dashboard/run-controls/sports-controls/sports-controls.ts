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

interface CompetitionInfo {
  code: string;
  name: string;
}

const FALLBACK_COMPETITIONS: CompetitionInfo[] = [
  { code: 'PD', name: 'La Liga' },
  { code: 'PL', name: 'Premier League' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'SA', name: 'Serie A' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'PPL', name: 'Primeira Liga' },
  { code: 'DED', name: 'Eredivisie' },
  { code: 'CL', name: 'Champions League' },
  { code: 'EC', name: 'European Championship' },
  { code: 'WC', name: 'World Cup' },
  { code: 'CLI', name: 'Copa Libertadores' },
  { code: 'BSA', name: 'Brasileirão' },
];

@Component({
  selector: 'app-sports-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './sports-controls.html',
  styleUrl: '../run-controls.scss',
})
export class SportsControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly competitions = signal<CompetitionInfo[]>(FALLBACK_COMPETITIONS);
  protected readonly code = signal<string>('PD');

  constructor() {
    this.loadCompetitions();
  }

  protected submit(): void {
    const competition = this.code();
    if (!competition) return;
    this.search.emit({ query: { competition } });
  }

  protected onChange(value: string): void {
    this.code.set(value);
    this.submit();
  }

  private loadCompetitions(): void {
    this.http
      .get<CompetitionInfo[]>(`${environment.apiBaseUrl}/sports/competitions`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          if (Array.isArray(list) && list.length > 0) {
            this.competitions.set(
              list.filter((c) => !!c?.code && !!c?.name),
            );
          }
        },
      });
  }
}
