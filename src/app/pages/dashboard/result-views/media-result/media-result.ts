import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApiInfo } from '../../../../core/models';
import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface MediaField {
  label: string;
  value: string;
}

interface MediaView {
  imageUrl: string | null;
  alt: string;
  isVideo: boolean;
  videoHref: string | null;
  caption: string | null;
  description: string | null;
  fields: MediaField[];
  link: { href: string; label: string } | null;
}

@Component({
  selector: 'app-media-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './media-result.html',
  styleUrl: './media-result.scss',
})
export class MediaResult {
  readonly api = input.required<ApiInfo>();
  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.wide;

  protected readonly view = computed<MediaView | null>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return null;
    return mapMedia(this.api().id, data as Record<string, unknown>);
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapMedia(id: string, d: Record<string, unknown>): MediaView {
  switch (id) {
    case 'pokemon':
      return view({
        imageUrl: str(d['spriteUrl']),
        alt: `Imagen de ${str(d['name']) ?? 'pokémon'}`,
        caption: capitalize(str(d['name'])),
        fields: [
          field('Tipos', joinList(d['types'])),
          field('Altura', formatDecimetres(d['height'])),
          field('Peso', formatHectograms(d['weight'])),
        ],
      });

    case 'cats':
      return view({
        imageUrl: str(d['url']),
        alt: 'Gato aleatorio',
        fields: [field('Dimensiones', dimensions(d['width'], d['height']))],
      });

    case 'photos':
      return view({
        imageUrl: str(d['regularUrl']) ?? str(d['thumbUrl']),
        alt: str(d['altDescription']) ?? str(d['description']) ?? 'Fotografía',
        caption: str(d['description']) ?? str(d['altDescription']),
        fields: [
          field('Autor', str(d['authorName'])),
          field('Usuario', prefix('@', str(d['authorUsername']))),
          field('Dimensiones', dimensions(d['width'], d['height'])),
        ],
      });

    case 'space': {
      const isVideo = str(d['mediaType']) === 'video';
      const url = str(d['hdUrl']) ?? str(d['url']);
      return view({
        imageUrl: isVideo ? null : url,
        alt: str(d['title']) ?? 'Imagen astronómica del día',
        isVideo,
        videoHref: isVideo ? url : null,
        caption: str(d['title']),
        description: str(d['explanation']),
        fields: [
          field('Fecha', str(d['date'])),
          field('Copyright', str(d['copyright'])),
        ],
      });
    }

    case 'users':
      return view({
        imageUrl: str(d['pictureUrl']),
        alt: `Foto de ${str(d['fullName']) ?? 'usuario'}`,
        caption: str(d['fullName']),
        fields: [
          field('Email', str(d['email'])),
          field('Género', str(d['gender'])),
          field('Nacionalidad', str(d['nationality'])),
          field('Ciudad', str(d['city'])),
          field('País', str(d['country'])),
        ],
      });

    case 'github':
      return view({
        imageUrl: str(d['avatarUrl']),
        alt: `Avatar de ${str(d['name']) ?? str(d['login']) ?? 'usuario'}`,
        caption: str(d['name']) ?? str(d['login']),
        description: str(d['bio']),
        fields: [
          field('Usuario', prefix('@', str(d['login']))),
          field('Repos públicos', numberStr(d['publicRepos'])),
          field('Seguidores', numberStr(d['followers'])),
          field('Siguiendo', numberStr(d['following'])),
          field('Compañía', str(d['company'])),
        ],
        link: linkOrNull(d['htmlUrl'], 'Ver perfil en GitHub'),
      });

    case 'countries':
      return view({
        imageUrl: str(d['flagUrl']),
        alt: `Bandera de ${str(d['commonName']) ?? 'país'}`,
        caption: str(d['commonName']),
        description: str(d['officialName']),
        fields: [
          field('Capital', str(d['capital'])),
          field('Región', joinRegion(d['region'], d['subregion'])),
          field('Población', numberStr(d['population'])),
          field('Área', areaStr(d['area'])),
          field('Idiomas', joinList(d['languages'])),
        ],
        link: linkOrNull(d['mapUrl'], 'Abrir en el mapa'),
      });

    case 'characters':
      return view({
        imageUrl: str(d['image']),
        alt: `Imagen de ${str(d['name']) ?? 'personaje'}`,
        caption: str(d['name']),
        fields: [
          field('Estado', str(d['status'])),
          field('Especie', str(d['species'])),
          field('Género', str(d['gender'])),
          field('Origen', str(d['origin'])),
          field('Ubicación', str(d['location'])),
          field('Episodios', numberStr(d['episodeCount'])),
        ],
      });

    default:
      return view({ alt: '' });
  }
}

function view(partial: Partial<MediaView> & { alt: string }): MediaView {
  return {
    imageUrl: partial.imageUrl ?? null,
    alt: partial.alt,
    isVideo: partial.isVideo ?? false,
    videoHref: partial.videoHref ?? null,
    caption: partial.caption ?? null,
    description: partial.description ?? null,
    fields: partial.fields ?? [],
    link: partial.link ?? null,
  };
}

function field(label: string, value: string | null | undefined): MediaField {
  return { label, value: value && value.length > 0 ? value : '—' };
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function numberStr(value: unknown): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return new Intl.NumberFormat('es-ES').format(value);
}

function joinList(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parts = value.map((v) => str(v)).filter((v): v is string => v !== null);
  return parts.length ? parts.join(', ') : null;
}

function joinRegion(region: unknown, subregion: unknown): string | null {
  const r = str(region);
  const s = str(subregion);
  if (r && s) return `${r} · ${s}`;
  return r ?? s;
}

function dimensions(w: unknown, h: unknown): string | null {
  const wn = typeof w === 'number' ? w : null;
  const hn = typeof h === 'number' ? h : null;
  if (wn === null || hn === null) return null;
  return `${wn} × ${hn}`;
}

function formatDecimetres(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  return `${(value / 10).toFixed(1)} m`;
}

function formatHectograms(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  return `${(value / 10).toFixed(1)} kg`;
}

function areaStr(value: unknown): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${new Intl.NumberFormat('es-ES').format(value)} km²`;
}

function prefix(p: string, value: string | null): string | null {
  return value ? `${p}${value}` : null;
}

function capitalize(value: string | null): string | null {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function linkOrNull(value: unknown, label: string): { href: string; label: string } | null {
  const href = str(value);
  return href ? { href, label } : null;
}
