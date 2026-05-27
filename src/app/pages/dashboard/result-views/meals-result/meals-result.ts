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

interface Meal {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  thumbUrl: string | null;
  instructions: string | null;
  ingredients: Ingredient[];
  youtubeUrl: string | null;
}

interface MealSummary {
  id: string;
  name: string;
  thumbUrl: string | null;
}

@Component({
  selector: 'app-meals-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './meals-result.html',
  styleUrl: './meals-result.scss',
})
export class MealsResult {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.wide;

  protected readonly selectedDetail = signal<Meal | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly mode = computed<'meals' | 'gallery' | 'empty'>(() => {
    const data = this.data();
    if (Array.isArray(data) && data.length > 0 && isLightSummary(data[0])) return 'gallery';
    if (data && typeof data === 'object' && Array.isArray((data as { meals?: unknown }).meals)) {
      return 'meals';
    }
    return 'empty';
  });

  protected readonly meals = computed<Meal[]>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return [];
    const list = (data as { meals?: unknown }).meals;
    if (!Array.isArray(list)) return [];
    return list
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .map((m, i) => mapMeal(m, i));
  });

  protected readonly gallery = computed<MealSummary[]>(() => {
    const data = this.data();
    if (!Array.isArray(data)) return [];
    return data
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .map((m, i) => ({
        id: idFor(m['id'], i),
        name: str(m['name']) ?? 'Sin nombre',
        thumbUrl: str(m['thumbUrl']),
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
      .get<{ meals?: unknown }>(`${environment.apiBaseUrl}/meals/search`, {
        params: { q: name },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.meals) ? res.meals : [];
          const first = list.find(
            (m): m is Record<string, unknown> => !!m && typeof m === 'object',
          );
          if (first) {
            this.selectedDetail.set(mapMeal(first, 0));
          } else {
            this.detailError.set('No se encontró el detalle de esta receta.');
          }
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
          this.detailError.set('No se pudo cargar la receta.');
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

function mapMeal(m: Record<string, unknown>, index: number): Meal {
  return {
    id: idFor(m['id'], index),
    name: str(m['name']) ?? 'Sin nombre',
    category: str(m['category']),
    area: str(m['area']),
    thumbUrl: str(m['thumbUrl']),
    instructions: str(m['instructions']),
    ingredients: extractIngredients(m),
    youtubeUrl: str(m['youtubeUrl']),
  };
}

function extractIngredients(m: Record<string, unknown>): Ingredient[] {
  const fromArray = m['ingredients'];
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
