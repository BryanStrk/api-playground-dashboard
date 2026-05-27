import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  viewChildren,
} from '@angular/core';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface Track {
  trackId: number | string;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl: string | null;
  previewUrl: string | null;
}

@Component({
  selector: 'app-audio-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audio-result.html',
  styleUrl: './audio-result.scss',
})
export class AudioResult {
  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.square;
  protected readonly players = viewChildren<ElementRef<HTMLAudioElement>>('player');

  protected readonly tracks = computed<Track[]>(() => {
    const raw = this.data() as { tracks?: unknown } | null;
    if (!raw || !Array.isArray(raw.tracks)) return [];
    return raw.tracks
      .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
      .map((t, index) => ({
        trackId: typeof t['trackId'] === 'number' || typeof t['trackId'] === 'string' ? t['trackId'] : index,
        trackName: str(t['trackName']) ?? 'Sin título',
        artistName: str(t['artistName']) ?? 'Artista desconocido',
        collectionName: str(t['collectionName']) ?? '',
        artworkUrl: str(t['artworkUrl']),
        previewUrl: str(t['previewUrl']),
      }));
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }

  protected onPlay(event: Event): void {
    const current = event.target as HTMLAudioElement | null;
    if (!current) return;
    for (const ref of this.players()) {
      const el = ref.nativeElement;
      if (el !== current && !el.paused) el.pause();
    }
  }
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}
