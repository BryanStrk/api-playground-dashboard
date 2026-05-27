import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ApiInfo } from '../../../core/models';
import { RunParams } from '../../../core/api.service';
import { CatsControls } from './cats-controls/cats-controls';
import { CryptoControls } from './crypto-controls/crypto-controls';
import { MoviesControls } from './movies-controls/movies-controls';
import { MusicControls } from './music-controls/music-controls';
import { NewsControls } from './news-controls/news-controls';
import { PokemonControls } from './pokemon-controls/pokemon-controls';
import { SimpleSearchControls } from './simple-search-controls/simple-search-controls';
import { SportsControls } from './sports-controls/sports-controls';
import { WeatherControls } from './weather-controls/weather-controls';

export type ControlsKind =
  | 'weather'
  | 'countries'
  | 'sports'
  | 'dictionary'
  | 'github'
  | 'books'
  | 'pokemon'
  | 'cats'
  | 'movies'
  | 'music'
  | 'crypto'
  | 'news'
  | 'ai'
  | 'users'
  | 'exchange'
  | 'characters'
  | 'posts'
  | 'none';

const KIND_BY_ID: Record<string, ControlsKind> = {
  weather: 'weather',
  countries: 'countries',
  sports: 'sports',
  dictionary: 'dictionary',
  github: 'github',
  books: 'books',
  pokemon: 'pokemon',
  cats: 'cats',
  movies: 'movies',
  music: 'music',
  crypto: 'crypto',
  news: 'news',
  ai: 'ai',
  users: 'users',
  exchange: 'exchange',
  characters: 'characters',
  posts: 'posts',
};

export function controlsKindFor(id: string | null | undefined): ControlsKind {
  if (!id) return 'none';
  return KIND_BY_ID[id] ?? 'none';
}

@Component({
  selector: 'app-run-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CatsControls,
    CryptoControls,
    MoviesControls,
    MusicControls,
    NewsControls,
    PokemonControls,
    SimpleSearchControls,
    SportsControls,
    WeatherControls,
  ],
  templateUrl: './run-controls.html',
})
export class RunControls {
  readonly api = input.required<ApiInfo>();
  readonly search = output<RunParams>();

  protected readonly kind = computed<ControlsKind>(() => controlsKindFor(this.api().id));

  protected emit(params: RunParams): void {
    this.search.emit(params);
  }
}
