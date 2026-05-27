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
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

interface Episode {
  id: number;
  name: string;
  code: string | null;
  airDate: string | null;
  characterIds: number[];
}

interface Location {
  id: number;
  name: string;
  type: string | null;
  dimension: string | null;
  residentCount: number;
}

type Mode =
  | 'character-detail'
  | 'character-gallery'
  | 'episode-list'
  | 'episode-detail'
  | 'location-list'
  | 'empty';

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

  // character detail loaded after clicking a gallery card
  protected readonly selectedCharacter = signal<Character | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly detailError = signal<string | null>(null);

  // episode detail: clicked episode + characters loaded for it
  protected readonly selectedEpisode = signal<Episode | null>(null);
  protected readonly episodeCharacters = signal<Character[] | null>(null);
  protected readonly loadingEpisode = signal(false);
  protected readonly episodeError = signal<string | null>(null);

  protected readonly mode = computed<Mode>(() => {
    const data = this.data();
    if (Array.isArray(data)) {
      const first = data.find((d) => d && typeof d === 'object') as
        | Record<string, unknown>
        | undefined;
      if (!first) return 'empty';
      if ('episode' in first) return 'episode-list';
      if ('dimension' in first) return 'location-list';
      return 'character-gallery';
    }
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if ('info' in d && Array.isArray(d['results'])) return 'character-gallery';
      if ('episode' in d && Array.isArray(d['characterIds'])) return 'episode-detail';
      if ('imageUrl' in d || 'image' in d) return 'character-detail';
    }
    return 'empty';
  });

  protected readonly characterGallery = computed<Character[]>(() => {
    const data = this.data();
    if (Array.isArray(data)) {
      return data
        .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
        .map(mapCharacter)
        .filter((c) => c.id > 0);
    }
    if (data && typeof data === 'object') {
      const results = (data as { results?: unknown }).results;
      if (Array.isArray(results)) {
        return results
          .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
          .map(mapCharacter)
          .filter((c) => c.id > 0);
      }
    }
    return [];
  });

  protected readonly characterDetailFromData = computed<Character | null>(() => {
    const data = this.data();
    if (Array.isArray(data) || !data || typeof data !== 'object') return null;
    if ('info' in (data as object)) return null;
    if ('episode' in (data as object) && 'characterIds' in (data as object)) return null;
    return mapCharacter(data as Record<string, unknown>);
  });

  protected readonly episodes = computed<Episode[]>(() => {
    const data = this.data();
    if (!Array.isArray(data)) return [];
    return data
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map(mapEpisode)
      .filter((e) => e.id > 0);
  });

  protected readonly locations = computed<Location[]>(() => {
    const data = this.data();
    if (!Array.isArray(data)) return [];
    return data
      .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
      .map(mapLocation)
      .filter((l) => l.id > 0);
  });

  protected readonly episodeFromData = computed<Episode | null>(() => {
    const data = this.data();
    if (Array.isArray(data) || !data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    if (!('episode' in d) || !Array.isArray(d['characterIds'])) return null;
    return mapEpisode(d);
  });

  protected readonly currentCharacter = computed<Character | null>(() => {
    if (this.selectedCharacter()) return this.selectedCharacter();
    return this.characterDetailFromData();
  });

  protected readonly showCharacterDetail = computed<boolean>(
    () => this.currentCharacter() !== null,
  );

  constructor() {
    effect(() => {
      this.data();
      this.selectedCharacter.set(null);
      this.selectedEpisode.set(null);
      this.episodeCharacters.set(null);
      this.detailError.set(null);
      this.episodeError.set(null);
    });
  }

  protected selectCharacter(id: number): void {
    this.loadingDetail.set(true);
    this.selectedCharacter.set(null);
    this.detailError.set(null);
    this.http
      .get<Record<string, unknown>>(`${environment.apiBaseUrl}/characters/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.selectedCharacter.set(mapCharacter(res));
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
          this.detailError.set('No se pudo cargar el personaje.');
        },
      });
  }

  protected backCharacter(): void {
    this.selectedCharacter.set(null);
    this.detailError.set(null);
  }

  protected selectEpisode(episode: Episode): void {
    this.selectedEpisode.set(episode);
    this.episodeCharacters.set(null);
    this.episodeError.set(null);
    const ids = episode.characterIds;
    if (ids.length === 0) {
      this.episodeCharacters.set([]);
      return;
    }
    this.loadingEpisode.set(true);
    const requests = ids.map((id) =>
      this.http
        .get<Record<string, unknown>>(`${environment.apiBaseUrl}/characters/${id}`)
        .pipe(catchError(() => of(null))),
    );
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const characters = results
            .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
            .map(mapCharacter)
            .filter((c) => c.id > 0);
          this.episodeCharacters.set(characters);
          this.loadingEpisode.set(false);
        },
        error: () => {
          this.loadingEpisode.set(false);
          this.episodeError.set('No se pudieron cargar los personajes de este episodio.');
        },
      });
  }

  protected backEpisode(): void {
    this.selectedEpisode.set(null);
    this.episodeCharacters.set(null);
    this.episodeError.set(null);
  }

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }

  protected showEpisodeDetail(): boolean {
    return this.selectedEpisode() !== null || this.mode() === 'episode-detail';
  }

  protected currentEpisode(): Episode | null {
    return this.selectedEpisode() ?? this.episodeFromData();
  }

  protected showEpisodeBack(): boolean {
    return this.selectedEpisode() !== null;
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

function mapEpisode(e: Record<string, unknown>): Episode {
  return {
    id: typeof e['id'] === 'number' ? e['id'] : -1,
    name: str(e['name']) ?? 'Sin nombre',
    code: str(e['episode']),
    airDate: str(e['airDate']),
    characterIds: Array.isArray(e['characterIds'])
      ? e['characterIds'].filter((n): n is number => typeof n === 'number')
      : [],
  };
}

function mapLocation(l: Record<string, unknown>): Location {
  return {
    id: typeof l['id'] === 'number' ? l['id'] : -1,
    name: str(l['name']) ?? 'Sin nombre',
    type: str(l['type']),
    dimension: str(l['dimension']),
    residentCount: typeof l['residentCount'] === 'number' ? l['residentCount'] : 0,
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
