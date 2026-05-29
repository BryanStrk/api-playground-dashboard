export type ResultViewType =
  | 'MEDIA'
  | 'AUDIO'
  | 'GALLERY'
  | 'MOVIES'
  | 'TEXT'
  | 'STAT'
  | 'SPORTS'
  | 'MEALS'
  | 'CHARACTERS'
  | 'SPACE'
  | 'BOOKS'
  | 'QR'
  | 'HOLIDAYS'
  | 'HACKERNEWS'
  | 'TRIVIA'
  | 'DOTA'
  | 'WORLDCUP'
  | 'BALLDONTLIE'
  | 'RAW';

const VIEW_TYPE_BY_ID: Record<string, ResultViewType> = {
  photos: 'MEDIA',
  space: 'SPACE',
  users: 'MEDIA',
  github: 'MEDIA',
  countries: 'MEDIA',
  sports: 'SPORTS',
  characters: 'CHARACTERS',
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
  dota: 'DOTA',
  worldcup: 'WORLDCUP',
  balldontlie: 'BALLDONTLIE',
};

export function viewTypeFor(apiId: string | null | undefined): ResultViewType {
  if (!apiId) return 'RAW';
  return VIEW_TYPE_BY_ID[apiId] ?? 'RAW';
}
