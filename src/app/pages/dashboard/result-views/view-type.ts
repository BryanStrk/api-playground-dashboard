export type ResultViewType = 'MEDIA' | 'AUDIO' | 'GALLERY' | 'TEXT' | 'STAT' | 'STANDINGS' | 'RAW';

const VIEW_TYPE_BY_ID: Record<string, ResultViewType> = {
  pokemon: 'MEDIA',
  cats: 'MEDIA',
  photos: 'MEDIA',
  space: 'MEDIA',
  users: 'MEDIA',
  github: 'MEDIA',
  countries: 'MEDIA',
  sports: 'STANDINGS',
  characters: 'MEDIA',
  music: 'AUDIO',
  movies: 'GALLERY',
  news: 'GALLERY',
  books: 'GALLERY',
  ai: 'TEXT',
  dictionary: 'TEXT',
  posts: 'TEXT',
  crypto: 'STAT',
  exchange: 'STAT',
  weather: 'STAT',
};

export function viewTypeFor(apiId: string | null | undefined): ResultViewType {
  if (!apiId) return 'RAW';
  return VIEW_TYPE_BY_ID[apiId] ?? 'RAW';
}
