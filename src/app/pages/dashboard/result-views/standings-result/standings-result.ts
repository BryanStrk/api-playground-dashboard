import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface StandingRow {
  position: number;
  teamName: string;
  crestUrl: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
}

interface StandingsView {
  competition: string;
  season: string | null;
  rows: StandingRow[];
}

@Component({
  selector: 'app-standings-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './standings-result.html',
  styleUrl: './standings-result.scss',
})
export class StandingsResult {
  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.square;

  protected readonly view = computed<StandingsView | null>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return null;
    return mapStandings(data as Record<string, unknown>);
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapStandings(d: Record<string, unknown>): StandingsView {
  const table = Array.isArray(d['table']) ? d['table'] : [];
  const rows: StandingRow[] = table
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      position: num(r['position']) ?? 0,
      teamName: str(r['teamName']) ?? '—',
      crestUrl: str(r['crestUrl']),
      played: num(r['played']) ?? 0,
      won: num(r['won']) ?? 0,
      draw: num(r['draw']) ?? 0,
      lost: num(r['lost']) ?? 0,
      points: num(r['points']) ?? 0,
    }));
  return {
    competition: str(d['competition']) ?? 'Clasificación',
    season: str(d['season']),
    rows,
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
