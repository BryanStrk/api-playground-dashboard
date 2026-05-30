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

interface CocktailCategory {
  id: string;
  name: string;
}

@Component({
  selector: 'app-cocktails-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './cocktails-controls.html',
  styleUrl: '../run-controls.scss',
})
export class CocktailsControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly categories = signal<CocktailCategory[]>([]);
  protected readonly name = signal('');
  protected readonly category = signal('');
  protected readonly alcoholic = signal('');

  constructor() {
    this.loadCategories();
  }

  protected submit(): void {
    const name = this.name().trim();
    const category = this.category();
    const alcoholic = this.alcoholic();
    if (category) {
      this.search.emit({
        endpoint: '/api/v1/cocktails/filter',
        query: { category },
      });
      return;
    }
    if (alcoholic) {
      this.search.emit({
        endpoint: '/api/v1/cocktails/filter',
        query: { alcoholic },
      });
      return;
    }
    this.search.emit({ query: { q: name || null } });
  }

  private loadCategories(): void {
    this.http
      .get<CocktailCategory[]>(`${environment.apiBaseUrl}/cocktails/categories`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.categories.set(
            (list ?? [])
              .filter((c) => !!c?.name)
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        },
      });
  }
}
