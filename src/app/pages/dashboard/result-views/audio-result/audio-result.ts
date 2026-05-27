import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

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

  protected readonly placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="sin caratula">' +
        '<rect width="80" height="80" fill="#e5e7eb"/>' +
        '<text x="40" y="44" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#6b7280">sin imagen</text>' +
        '</svg>',
    );

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
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src === this.placeholder) return;
    img.src = this.placeholder;
  }
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}
