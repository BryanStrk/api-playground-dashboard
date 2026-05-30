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

  protected readonly gallery = computed<CocktailSummary[]>(() =>
    toSummaryList(this.data())
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
      .map((c, i) => ({
        id: idFor(c['id'], i),
        name: str(c['name']) ?? 'Sin nombre',
        thumbUrl: str(c['thumb']) ?? str(c['thumbUrl']),
      })),
  );

  protected readonly mode = computed<'gallery' | 'empty'>(() =>
    this.gallery().length > 0 ? 'gallery' : 'empty',
  );

  constructor() {
    effect(() => {
      this.data();
      this.selectedDetail.set(null);
      this.detailError.set(null);
    });
  }

  protected select(id: string): void {
    this.loadingDetail.set(true);
    this.selectedDetail.set(null);
    this.detailError.set(null);

    this.http
      .get<unknown>(`${environment.apiBaseUrl}/cocktails/${encodeURIComponent(id)}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const detail = pickCocktail(res);
          if (detail) {
            this.selectedDetail.set(mapCocktail(detail, 0));
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
    thumbUrl: str(c['thumbUrl']) ?? str(c['thumb']),
    instructions: str(c['instructions']),
    ingredients: extractIngredients(c),
  };
}

function pickCocktail(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null;
  const list = (res as { cocktails?: unknown }).cocktails;
  if (Array.isArray(list)) {
    return list.find((c): c is Record<string, unknown> => !!c && typeof c === 'object') ?? null;
  }
  return res as Record<string, unknown>;
}

function toSummaryList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const list = (data as { cocktails?: unknown }).cocktails;
    if (Array.isArray(list)) return list;
  }
  return [];
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

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function idFor(value: unknown, fallback: number): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : `i${fallback}`;
}
