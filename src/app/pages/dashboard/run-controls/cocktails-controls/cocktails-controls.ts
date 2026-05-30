import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
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

/** Default category loaded on open so a clickable grid shows without typing. */
const DEFAULT_CATEGORY = 'Cocktail';

/** Spanish labels for the categories returned (in English) by the API. */
const CATEGORY_LABELS_ES: Record<string, string> = {
  Cocktail: 'Cóctel',
  'Ordinary Drink': 'Bebida común',
  Shot: 'Chupito',
  Beer: 'Cerveza',
  'Soft Drink': 'Refresco',
  'Coffee / Tea': 'Café / Té',
  Shake: 'Batido',
  'Punch / Party Drink': 'Ponche / fiesta',
  Cocoa: 'Cacao',
  'Homemade Liqueur': 'Licor casero',
  'Other / Unknown': 'Otros',
};

@Component({
  selector: 'app-cocktails-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './cocktails-controls.html',
  styleUrl: '../run-controls.scss',
})
export class CocktailsControls implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly categories = signal<CocktailCategory[]>([]);
  protected readonly name = signal('');
  protected readonly category = signal(DEFAULT_CATEGORY);
  protected readonly alcoholic = signal('');

  constructor() {
    this.loadCategories();
  }

  ngOnInit(): void {
    // Selection-first: open straight into a popular category grid, no typing.
    this.search.emit({
      endpoint: '/api/v1/cocktails/filter/category',
      query: { c: DEFAULT_CATEGORY },
    });
  }

  protected categoryLabel(name: string): string {
    return CATEGORY_LABELS_ES[name] ?? name;
  }

  protected submit(): void {
    const name = this.name().trim();
    const category = this.category();
    const alcoholic = this.alcoholic();
    if (category) {
      this.search.emit({
        endpoint: '/api/v1/cocktails/filter/category',
        query: { c: category },
      });
      return;
    }
    if (alcoholic) {
      this.search.emit({
        endpoint: '/api/v1/cocktails/filter/alcoholic',
        query: { a: alcoholic },
      });
      return;
    }
    this.search.emit({
      endpoint: '/api/v1/cocktails/search',
      query: { name: name || null },
    });
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
              .sort((a, b) => this.categoryLabel(a.name).localeCompare(this.categoryLabel(b.name))),
          );
        },
      });
  }
}
