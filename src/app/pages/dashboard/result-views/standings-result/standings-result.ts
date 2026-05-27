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

interface GroupTable {
  name: string;
  rows: StandingRow[];
}

interface StandingsView {
  competition: string;
  season: string | null;
  rows: StandingRow[];
  groups: GroupTable[];
}

interface StandingsSection {
  title: string | null;
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

  protected readonly sections = computed<StandingsSection[]>(() => {
    const v = this.view();
    if (!v) return [];
    if (v.groups.length > 0) {
      return v.groups.map((g) => ({ title: g.name, rows: g.rows }));
    }
    if (v.rows.length > 0) {
      return [{ title: null, rows: v.rows }];
    }
    return [];
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapStandings(d: Record<string, unknown>): StandingsView {
  const competition = str(d['competition']) ?? 'Clasificación';
  const season = str(d['season']);

  const rawGroups = Array.isArray(d['groups']) ? d['groups'] : [];
  const groups: GroupTable[] = rawGroups
    .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
    .map((g, i) => ({
      name: str(g['groupName']) ?? `Grupo ${i + 1}`,
      rows: mapRows(g['table']),
    }))
    .filter((g) => g.rows.length > 0);

  return {
    competition,
    season,
    rows: mapRows(d['table']),
    groups,
  };
}

function mapRows(value: unknown): StandingRow[] {
  if (!Array.isArray(value)) return [];
  return value
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
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}
