import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApiInfo } from '../../../../core/models';
import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

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

  protected readonly placeholder = IMAGE_PLACEHOLDER.poster;

  protected readonly items = computed<GalleryItem[]>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return [];
    const id = this.api().id;
    return mapItems(id, data as Record<string, unknown>);
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapItems(id: string, d: Record<string, unknown>): GalleryItem[] {
  switch (id) {
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

function isoDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

function idFor(value: unknown, fallback: number): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : `i${fallback}`;
}
