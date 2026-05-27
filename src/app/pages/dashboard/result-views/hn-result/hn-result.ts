import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Story {
  id: number;
  title: string;
  url: string;
  by: string | null;
  score: number;
  descendants: number;
  relativeTime: string | null;
  host: string | null;
}

const HN_ITEM_URL = 'https://news.ycombinator.com/item?id=';
const RTF = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

@Component({
  selector: 'app-hn-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hn-result.html',
  styleUrl: './hn-result.scss',
})
export class HnResult {
  readonly data = input.required<unknown>();

  protected readonly stories = computed<Story[]>(() => {
    const data = this.data();
    if (!Array.isArray(data)) return [];
    return data
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
      .map(mapStory)
      .filter((s) => s.id > 0);
  });
}

function mapStory(s: Record<string, unknown>): Story {
  const id = typeof s['id'] === 'number' ? s['id'] : -1;
  const externalUrl = str(s['url']);
  const url = externalUrl ?? `${HN_ITEM_URL}${id}`;
  const time = typeof s['time'] === 'number' ? s['time'] : null;
  return {
    id,
    title: str(s['title']) ?? 'Sin título',
    url,
    by: str(s['by']),
    score: typeof s['score'] === 'number' ? s['score'] : 0,
    descendants: typeof s['descendants'] === 'number' ? s['descendants'] : 0,
    relativeTime: time !== null ? relativeFromEpoch(time) : null,
    host: externalUrl ? hostnameOf(externalUrl) : null,
  };
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function relativeFromEpoch(epochSeconds: number): string {
  const diffSec = Math.round(epochSeconds - Date.now() / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return RTF.format(diffSec, 'second');
  if (abs < 3600) return RTF.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return RTF.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return RTF.format(Math.round(diffSec / 86400), 'day');
  if (abs < 86400 * 365) return RTF.format(Math.round(diffSec / (86400 * 30)), 'month');
  return RTF.format(Math.round(diffSec / (86400 * 365)), 'year');
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}
