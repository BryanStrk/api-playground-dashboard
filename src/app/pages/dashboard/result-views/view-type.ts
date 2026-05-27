export type ResultViewType =
  | 'MEDIA'
  | 'AUDIO'
  | 'GALLERY'
  | 'MOVIES'
  | 'TEXT'
  | 'STAT'
  | 'SPORTS'
  | 'CHAT'
  | 'MEALS'
  | 'CHARACTERS'
  | 'SPACE'
  | 'BOOKS'
  | 'QR'
  | 'HOLIDAYS'
  | 'HACKERNEWS'
  | 'TRIVIA'
  | 'DOTA'
  | 'RAW';

const VIEW_TYPE_BY_ID: Record<string, ResultViewType> = {
  pokemon: 'MEDIA',
  cats: 'MEDIA',
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
  ai: 'CHAT',
  dictionary: 'TEXT',
  posts: 'TEXT',
  crypto: 'STAT',
  meals: 'MEALS',
  exchange: 'STAT',
  weather: 'STAT',
  qrcode: 'QR',
  holidays: 'HOLIDAYS',
  hn: 'HACKERNEWS',
  trivia: 'TRIVIA',
  dota: 'DOTA',
};

export function viewTypeFor(apiId: string | null | undefined): ResultViewType {
  if (!apiId) return 'RAW';
  return VIEW_TYPE_BY_ID[apiId] ?? 'RAW';
}
