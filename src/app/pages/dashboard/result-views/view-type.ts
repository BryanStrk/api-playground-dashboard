export type ResultViewType =
  | 'MEDIA'
  | 'AUDIO'
  | 'GALLERY'
  | 'MOVIES'
  | 'TEXT'
  | 'STAT'
  | 'SPORTS'
  | 'MEALS'
  | 'SPACE'
  | 'BOOKS'
  | 'QR'
  | 'HOLIDAYS'
  | 'HACKERNEWS'
  | 'TRIVIA'
  | 'WORLDCUP'
  | 'BALLDONTLIE'
  | 'COCKTAILS'
  | 'RAW';

const VIEW_TYPE_BY_ID: Record<string, ResultViewType> = {
  photos: 'MEDIA',
  space: 'SPACE',
  users: 'MEDIA',
  countries: 'MEDIA',
  sports: 'SPORTS',
  music: 'AUDIO',
  movies: 'MOVIES',
  news: 'GALLERY',
  books: 'BOOKS',
  posts: 'TEXT',
  meals: 'MEALS',
  weather: 'STAT',
  qrcode: 'QR',
  holidays: 'HOLIDAYS',
  hn: 'HACKERNEWS',
  trivia: 'TRIVIA',
  worldcup: 'WORLDCUP',
  balldontlie: 'BALLDONTLIE',
  cocktails: 'COCKTAILS',
};

export function viewTypeFor(apiId: string | null | undefined): ResultViewType {
  if (!apiId) return 'RAW';
  return VIEW_TYPE_BY_ID[apiId] ?? 'RAW';
}
