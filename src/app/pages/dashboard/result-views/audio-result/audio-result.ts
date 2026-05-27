import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface Track {
  trackId: string;
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
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.square;
  protected readonly playingId = signal<string | null>(null);
  protected readonly loadingId = signal<string | null>(null);

  private current: HTMLAudioElement | null = null;
  private currentId: string | null = null;

  protected readonly tracks = computed<Track[]>(() => {
    const raw = this.data() as { tracks?: unknown } | null;
    if (!raw || !Array.isArray(raw.tracks)) return [];
    return raw.tracks
      .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
      .map((t, index) => ({
        trackId: idFor(t['trackId'], index),
        trackName: str(t['trackName']) ?? 'Sin título',
        artistName: str(t['artistName']) ?? 'Artista desconocido',
        collectionName: str(t['collectionName']) ?? '',
        artworkUrl: str(t['artworkUrl']),
        previewUrl: str(t['previewUrl']),
      }));
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  protected isPlaying(id: string): boolean {
    return this.playingId() === id;
  }

  protected isLoading(id: string): boolean {
    return this.loadingId() === id;
  }

  protected toggle(track: Track): void {
    if (!track.previewUrl) return;
    if (this.isPlaying(track.trackId)) {
      this.stop();
      return;
    }
    this.stop();
    const audio = new Audio(track.previewUrl);
    audio.preload = 'metadata';
    audio.addEventListener('ended', () => this.handleEnded(track.trackId));
    audio.addEventListener('pause', () => this.handlePause(track.trackId));
    audio.addEventListener('error', () => this.handleError(track.trackId));
    this.current = audio;
    this.currentId = track.trackId;
    this.loadingId.set(track.trackId);
    audio
      .play()
      .then(() => {
        if (this.currentId === track.trackId) {
          this.playingId.set(track.trackId);
          this.loadingId.set(null);
        }
      })
      .catch(() => this.handleError(track.trackId));
  }

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }

  private stop(): void {
    if (this.current) {
      this.current.pause();
      this.current.src = '';
      this.current = null;
    }
    this.currentId = null;
    this.playingId.set(null);
    this.loadingId.set(null);
  }

  private handleEnded(id: string): void {
    if (this.currentId !== id) return;
    this.stop();
  }

  private handlePause(id: string): void {
    if (this.currentId !== id) return;
    // Only clear if we still consider it playing; ignore pauses triggered by stop().
    if (this.playingId() === id) this.playingId.set(null);
  }

  private handleError(id: string): void {
    if (this.currentId !== id) return;
    this.stop();
  }
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function idFor(value: unknown, fallback: number): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : `t${fallback}`;
}
