import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface Team {
  id: string;
  name: string;
  crest: string | null;
  venue: string | null;
  founded: number | null;
}

interface TeamsView {
  competition: string;
  teams: Team[];
}

@Component({
  selector: 'app-teams-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teams-result.html',
  styleUrl: './teams-result.scss',
})
export class TeamsResult {
  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.square;

  protected readonly view = computed<TeamsView | null>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return null;
    return mapView(data as Record<string, unknown>);
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapView(d: Record<string, unknown>): TeamsView {
  const list = Array.isArray(d['teams']) ? d['teams'] : [];
  return {
    competition: str(d['competition']) ?? 'Equipos',
    teams: list
      .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
      .map((t, i) => ({
        id: str(t['name']) ?? `t${i}`,
        name: str(t['name']) ?? 'Sin nombre',
        crest: str(t['crest']),
        venue: str(t['venue']),
        founded: num(t['founded']),
      })),
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
