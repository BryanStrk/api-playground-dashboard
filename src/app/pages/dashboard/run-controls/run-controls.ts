import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ApiInfo } from '../../../core/models';
import { RunParams } from '../../../core/api.service';
import { CocktailsControls } from './cocktails-controls/cocktails-controls';
import { HnControls } from './hn-controls/hn-controls';
import { HolidaysControls } from './holidays-controls/holidays-controls';
import { MealsControls } from './meals-controls/meals-controls';
import { MoviesControls } from './movies-controls/movies-controls';
import { MusicControls } from './music-controls/music-controls';
import { NewsControls } from './news-controls/news-controls';
import { PhotosControls } from './photos-controls/photos-controls';
import { QrControls } from './qr-controls/qr-controls';
import { SpaceControls } from './space-controls/space-controls';
import { UsersControls } from './users-controls/users-controls';
import { SimpleSearchControls } from './simple-search-controls/simple-search-controls';
import { SportsControls } from './sports-controls/sports-controls';
import { WeatherControls } from './weather-controls/weather-controls';

export type ControlsKind =
  | 'weather'
  | 'countries'
  | 'sports'
  | 'books'
  | 'movies'
  | 'music'
  | 'news'
  | 'users'
  | 'photos'
  | 'space'
  | 'meals'
  | 'qrcode'
  | 'holidays'
  | 'hn'
  | 'posts'
  | 'cocktails'
  | 'none';

const KIND_BY_ID: Record<string, ControlsKind> = {
  weather: 'weather',
  countries: 'countries',
  sports: 'sports',
  books: 'books',
  movies: 'movies',
  music: 'music',
  news: 'news',
  users: 'users',
  photos: 'photos',
  space: 'space',
  meals: 'meals',
  qrcode: 'qrcode',
  holidays: 'holidays',
  hn: 'hn',
  posts: 'posts',
  cocktails: 'cocktails',
};

export function controlsKindFor(id: string | null | undefined): ControlsKind {
  if (!id) return 'none';
  return KIND_BY_ID[id] ?? 'none';
}

@Component({
  selector: 'app-run-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CocktailsControls,
    HnControls,
    HolidaysControls,
    MealsControls,
    MoviesControls,
    MusicControls,
    NewsControls,
    PhotosControls,
    QrControls,
    SimpleSearchControls,
    SpaceControls,
    SportsControls,
    UsersControls,
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
