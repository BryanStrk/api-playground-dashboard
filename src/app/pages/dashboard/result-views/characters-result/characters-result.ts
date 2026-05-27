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
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';
import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface Character {
  id: number;
  name: string;
  status: string | null;
  species: string | null;
  gender: string | null;
  origin: string | null;
  location: string | null;
  imageUrl: string | null;
  episodeCount: number | null;
}

@Component({
  selector: 'app-characters-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './characters-result.html',
  styleUrl: './characters-result.scss',
})
export class CharactersResult {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.poster;

  protected readonly selectedId = signal<number | null>(null);
  protected readonly details = signal<Character | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly mode = computed<'detail' | 'gallery' | 'empty'>(() => {
    const data = this.data();
    if (Array.isArray(data)) return 'gallery';
    if (data && typeof data === 'object') return 'detail';
    return 'empty';
  });

  protected readonly gallery = computed<Character[]>(() => {
    const data = this.data();
    if (!Array.isArray(data)) return [];
    return data
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
      .map(mapCharacter)
      .filter((c) => c.id > 0);
  });

  protected readonly single = computed<Character | null>(() => {
    const data = this.data();
    if (Array.isArray(data) || !data || typeof data !== 'object') return null;
    return mapCharacter(data as Record<string, unknown>);
  });

  protected readonly current = computed<Character | null>(() => {
    if (this.selectedId() !== null) return this.details();
    if (this.mode() === 'detail') return this.single();
    return null;
  });

  constructor() {
    effect(() => {
      this.data();
      this.selectedId.set(null);
      this.details.set(null);
      this.detailError.set(null);
    });
  }

  protected select(id: number): void {
    this.selectedId.set(id);
    this.loadDetail(id);
  }

  protected back(): void {
    this.selectedId.set(null);
    this.details.set(null);
    this.detailError.set(null);
  }

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }

  private loadDetail(id: number): void {
    this.loadingDetail.set(true);
    this.details.set(null);
    this.detailError.set(null);
    this.http
      .get<Record<string, unknown>>(`${environment.apiBaseUrl}/characters/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.details.set(mapCharacter(res));
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
          this.detailError.set('No se pudo cargar el personaje.');
        },
      });
  }
}

function mapCharacter(c: Record<string, unknown>): Character {
  return {
    id: typeof c['id'] === 'number' ? c['id'] : -1,
    name: str(c['name']) ?? 'Sin nombre',
    status: str(c['status']),
    species: str(c['species']),
    gender: str(c['gender']),
    origin: str(c['origin']),
    location: str(c['location']),
    imageUrl: str(c['imageUrl']) ?? str(c['image']),
    episodeCount: num(c['episodeCount']),
  };
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}
