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

interface Genre {
  id: number;
  name: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => CURRENT_YEAR - i);

@Component({
  selector: 'app-movies-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './movies-controls.html',
  styleUrl: '../run-controls.scss',
})
export class MoviesControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly genres = signal<Genre[]>([]);
  protected readonly years = YEARS;

  protected readonly query = signal('');
  protected readonly genre = signal<string>('');
  protected readonly year = signal<string>('');

  constructor() {
    this.loadGenres();
  }

  protected submit(): void {
    const params: RunParams = {
      endpoint: '/api/v1/movies',
      query: {
        query: this.query().trim() || null,
        genre: this.genre() || null,
        year: this.year() || null,
      },
    };
    this.search.emit(params);
  }

  private loadGenres(): void {
    this.http
      .get<Genre[]>(`${environment.apiBaseUrl}/movies/genres`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.genres.set(
            (list ?? [])
              .filter((g) => g?.id != null && !!g?.name)
              .sort((a, b) => a.name.localeCompare(b.name, 'es')),
          );
        },
      });
  }
}
