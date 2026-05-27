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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface MovieSummary {
  id: number;
  title: string;
  posterUrl: string | null;
  rating: number | null;
  year: string | null;
}

interface MovieDetails {
  id: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  tagline: string | null;
  releaseDate: string | null;
  posterUrl: string | null;
  voteAverage: number | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
}

interface TrailerResponse {
  youtubeKey: string | null;
  youtubeUrl: string | null;
  name: string | null;
}

@Component({
  selector: 'app-movies-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './movies-result.html',
  styleUrl: './movies-result.scss',
})
export class MoviesResult {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.poster;

  protected readonly selectedId = signal<number | null>(null);
  protected readonly details = signal<MovieDetails | null>(null);
  protected readonly trailer = signal<TrailerResponse | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly movies = computed<MovieSummary[]>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return [];
    const list = (data as { movies?: unknown }).movies;
    if (!Array.isArray(list)) return [];
    return list
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .map((m) => ({
        id: typeof m['id'] === 'number' ? m['id'] : -1,
        title: str(m['title']) ?? str(m['originalTitle']) ?? 'Sin título',
        posterUrl: str(m['posterUrl']) ?? str(m['backdropUrl']),
        rating: num(m['voteAverage']),
        year: yearFrom(str(m['releaseDate'])),
      }))
      .filter((m) => m.id > 0);
  });

  protected readonly trailerEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const key = this.trailer()?.youtubeKey;
    if (!key) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${encodeURIComponent(key)}`,
    );
  });

  constructor() {
    effect(() => {
      this.data();
      this.selectedId.set(null);
      this.details.set(null);
      this.trailer.set(null);
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
    this.trailer.set(null);
    this.detailError.set(null);
  }

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }

  private loadDetail(id: number): void {
    this.loadingDetail.set(true);
    this.details.set(null);
    this.trailer.set(null);
    this.detailError.set(null);

    forkJoin({
      details: this.http.get<MovieDetails>(`${environment.apiBaseUrl}/movies/${id}`),
      trailer: this.http.get<TrailerResponse>(`${environment.apiBaseUrl}/movies/${id}/trailer`),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ details, trailer }) => {
          this.details.set(details);
          this.trailer.set(trailer);
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
          this.detailError.set('No se pudo cargar el detalle de la película.');
        },
      });
  }
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function yearFrom(date: string | null): string | null {
  if (!date || date.length < 4) return null;
  const y = date.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}
