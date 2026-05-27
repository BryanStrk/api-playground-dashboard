import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApiInfo } from '../../../../core/models';

interface GalleryItem {
  id: string;
  imageUrl: string | null;
  alt: string;
  title: string;
  meta: string | null;
  href: string | null;
}

@Component({
  selector: 'app-gallery-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-result.html',
  styleUrl: './gallery-result.scss',
})
export class GalleryResult {
  readonly api = input.required<ApiInfo>();
  readonly data = input.required<unknown>();

  protected readonly placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" role="img" aria-label="sin imagen">' +
        '<rect width="240" height="320" fill="#e5e7eb"/>' +
        '<text x="120" y="166" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#6b7280">sin imagen</text>' +
        '</svg>',
    );

  protected readonly items = computed<GalleryItem[]>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return [];
    const id = this.api().id;
    return mapItems(id, data as Record<string, unknown>);
  });

  protected onImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src === this.placeholder) return;
    img.src = this.placeholder;
  }
}

function mapItems(id: string, d: Record<string, unknown>): GalleryItem[] {
  switch (id) {
    case 'movies': {
      const list = arr(d['movies']);
      return list.map((m, i) => {
        const title = str(m['title']) ?? str(m['originalTitle']) ?? 'Sin título';
        const rating = numberValue(m['voteAverage']);
        const year = yearFromDate(str(m['releaseDate']));
        const meta = [
          rating !== null ? `★ ${rating.toFixed(1)}` : null,
          year,
        ].filter(Boolean).join(' · ') || null;
        return {
          id: idFor(m['id'], i),
          imageUrl: str(m['posterUrl']) ?? str(m['backdropUrl']),
          alt: `Póster de ${title}`,
          title,
          meta,
          href: null,
        };
      });
    }

    case 'news': {
      const list = arr(d['articles']);
      return list.map((a, i) => {
        const title = str(a['title']) ?? 'Sin título';
        const source = str(a['source']);
        const date = isoDate(str(a['publishedAt']));
        const meta = [source, date].filter(Boolean).join(' · ') || null;
        return {
          id: idFor(a['url'], i),
          imageUrl: str(a['imageUrl']),
          alt: `Imagen del artículo ${title}`,
          title,
          meta,
          href: str(a['url']),
        };
      });
    }

    case 'books': {
      const list = arr(d['books']);
      return list.map((b, i) => {
        const title = str(b['title']) ?? 'Sin título';
        const authors = joinList(b['authors']);
        const year = numberValue(b['firstPublishYear']);
        const meta = [authors, year !== null ? String(year) : null]
          .filter(Boolean)
          .join(' · ') || null;
        return {
          id: idFor(b['key'], i),
          imageUrl: str(b['coverUrl']),
          alt: `Portada de ${title}`,
          title,
          meta,
          href: null,
        };
      });
    }

    default:
      return [];
  }
}

function arr(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object');
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function joinList(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parts = value.map((v) => str(v)).filter((v): v is string => v !== null);
  return parts.length ? parts.join(', ') : null;
}

function yearFromDate(date: string | null): string | null {
  if (!date || date.length < 4) return null;
  const year = date.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

function isoDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

function idFor(value: unknown, fallback: number): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : `i${fallback}`;
}
