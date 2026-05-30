import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';
import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface Ingredient {
  name: string;
  measure: string | null;
}

interface Cocktail {
  id: string;
  name: string;
  category: string | null;
  glass: string | null;
  alcoholic: string | null;
  thumbUrl: string | null;
  instructions: string | null;
  ingredients: Ingredient[];
}

interface CocktailSummary {
  id: string;
  name: string;
  thumbUrl: string | null;
}

@Component({
  selector: 'app-cocktails-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './cocktails-result.html',
  styleUrl: './cocktails-result.scss',
})
export class CocktailsResult {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.wide;

  protected readonly selectedDetail = signal<Cocktail | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly mode = computed<'cocktails' | 'gallery' | 'empty'>(() => {
    const data = this.data();
    if (Array.isArray(data) && data.length > 0 && isLightSummary(data[0])) return 'gallery';
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray((data as { cocktails?: unknown }).cocktails)
    ) {
      return 'cocktails';
    }
    return 'empty';
  });

  protected readonly cocktails = computed<Cocktail[]>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return [];
    const list = (data as { cocktails?: unknown }).cocktails;
    if (!Array.isArray(list)) return [];
    return list
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
      .map((c, i) => mapCocktail(c, i));
  });

  protected readonly gallery = computed<CocktailSummary[]>(() => {
    const data = this.data();
    if (!Array.isArray(data)) return [];
    return data
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
      .map((c, i) => ({
        id: idFor(c['id'], i),
        name: str(c['name']) ?? 'Sin nombre',
        thumbUrl: str(c['thumbUrl']),
      }));
  });

  constructor() {
    effect(() => {
      this.data();
      this.selectedDetail.set(null);
      this.detailError.set(null);
    });
  }

  protected select(name: string): void {
    this.loadingDetail.set(true);
    this.selectedDetail.set(null);
    this.detailError.set(null);

    this.http
      .get<{ cocktails?: unknown }>(`${environment.apiBaseUrl}/cocktails/search`, {
        params: { q: name },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.cocktails) ? res.cocktails : [];
          const first = list.find(
            (c): c is Record<string, unknown> => !!c && typeof c === 'object',
          );
          if (first) {
            this.selectedDetail.set(mapCocktail(first, 0));
          } else {
            this.detailError.set('No se encontró el detalle de este cóctel.');
          }
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
          this.detailError.set('No se pudo cargar el cóctel.');
        },
      });
  }

  protected back(): void {
    this.selectedDetail.set(null);
    this.detailError.set(null);
  }

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapCocktail(c: Record<string, unknown>, index: number): Cocktail {
  return {
    id: idFor(c['id'], index),
    name: str(c['name']) ?? 'Sin nombre',
    category: str(c['category']),
    glass: str(c['glass']),
    alcoholic: str(c['alcoholic']),
    thumbUrl: str(c['thumbUrl']),
    instructions: str(c['instructions']),
    ingredients: extractIngredients(c),
  };
}

function extractIngredients(c: Record<string, unknown>): Ingredient[] {
  const fromArray = c['ingredients'];
  if (Array.isArray(fromArray)) {
    return fromArray
      .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
      .map((i) => ({
        name: str(i['name']) ?? '',
        measure: str(i['measure']),
      }))
      .filter((i) => i.name.length > 0);
  }
  return [];
}

function isLightSummary(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return 'name' in v && 'thumbUrl' in v && !('instructions' in v);
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function idFor(value: unknown, fallback: number): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : `i${fallback}`;
}
