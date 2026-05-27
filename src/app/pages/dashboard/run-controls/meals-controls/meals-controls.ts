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

interface MealCategory {
  id: string;
  name: string;
}

@Component({
  selector: 'app-meals-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './meals-controls.html',
  styleUrl: '../run-controls.scss',
})
export class MealsControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly categories = signal<MealCategory[]>([]);
  protected readonly name = signal('');
  protected readonly category = signal('');

  constructor() {
    this.loadCategories();
  }

  protected submit(): void {
    const name = this.name().trim();
    const category = this.category();
    if (category) {
      this.search.emit({
        endpoint: '/api/v1/meals/filter',
        query: { category },
      });
      return;
    }
    this.search.emit({ query: { q: name || null } });
  }

  private loadCategories(): void {
    this.http
      .get<MealCategory[]>(`${environment.apiBaseUrl}/meals/categories`)
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
