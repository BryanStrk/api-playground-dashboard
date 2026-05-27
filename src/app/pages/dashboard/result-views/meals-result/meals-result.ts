import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface Ingredient {
  name: string;
  measure: string | null;
}

interface MealView {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  thumbUrl: string | null;
  instructions: string | null;
  ingredients: Ingredient[];
  youtubeUrl: string | null;
}

@Component({
  selector: 'app-meals-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meals-result.html',
  styleUrl: './meals-result.scss',
})
export class MealsResult {
  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.wide;

  protected readonly meals = computed<MealView[]>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return [];
    const list = (data as { meals?: unknown }).meals;
    if (!Array.isArray(list)) return [];
    return list
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .map((m, index) => mapMeal(m, index));
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapMeal(m: Record<string, unknown>, index: number): MealView {
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
  // Fallback to TheMealDB's numbered fields (strIngredient1..20, strMeasure1..20)
  // in case the backend ever returns the raw shape unwrapped.
  const result: Ingredient[] = [];
  for (let n = 1; n <= 20; n++) {
    const name = str(m[`strIngredient${n}`]);
    if (!name) continue;
    result.push({ name, measure: str(m[`strMeasure${n}`]) });
  }
  return result;
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function idFor(value: unknown, fallback: number): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : `i${fallback}`;
}
