import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface ApodView {
  date: string | null;
  title: string;
  explanation: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  hdUrl: string | null;
  copyright: string | null;
  isVideo: boolean;
}

interface SpaceImage {
  nasaId: string;
  title: string;
  description: string | null;
  thumbUrl: string | null;
}

@Component({
  selector: 'app-space-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './space-result.html',
  styleUrl: './space-result.scss',
})
export class SpaceResult {
  private readonly sanitizer = inject(DomSanitizer);

  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.wide;
  protected readonly selected = signal<SpaceImage | null>(null);

  protected readonly mode = computed<'apod' | 'gallery' | 'empty'>(() => {
    const data = this.data();
    if (Array.isArray(data)) return 'gallery';
    if (data && typeof data === 'object' && 'mediaType' in (data as object)) return 'apod';
    return 'empty';
  });

  protected readonly apod = computed<ApodView | null>(() => {
    const data = this.data();
    if (Array.isArray(data) || !data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    const mediaType = str(d['mediaType']);
    const videoUrl = str(d['videoUrl']);
    const isVideo = mediaType === 'video' && !!videoUrl;
    return {
      date: str(d['date']),
      title: str(d['title']) ?? 'Imagen astronómica del día',
      explanation: str(d['explanation']),
      imageUrl: str(d['imageUrl']),
      videoUrl,
      hdUrl: str(d['hdUrl']),
      copyright: str(d['copyright']),
      isVideo,
    };
  });

  protected readonly gallery = computed<SpaceImage[]>(() => {
    const data = this.data();
    if (!Array.isArray(data)) return [];
    return data
      .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
      .map((i, idx) => ({
        nasaId: str(i['nasaId']) ?? `n${idx}`,
        title: str(i['title']) ?? 'Sin título',
        description: str(i['description']),
        thumbUrl: str(i['thumbUrl']),
      }))
      .filter((i) => i.title.length > 0);
  });

  protected readonly videoEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const a = this.apod();
    if (!a?.isVideo || !a.videoUrl) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(a.videoUrl);
  });

  constructor() {
    effect(() => {
      this.data();
      this.selected.set(null);
    });
  }

  protected select(image: SpaceImage): void {
    this.selected.set(image);
  }

  protected back(): void {
    this.selected.set(null);
  }

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}
