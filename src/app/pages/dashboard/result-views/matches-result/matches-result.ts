import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface Match {
  id: string;
  utcDate: string | null;
  whenLabel: string | null;
  status: string;
  statusLabel: string;
  matchday: number | null;
  homeTeam: string;
  homeCrest: string | null;
  awayTeam: string;
  awayCrest: string | null;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
}

interface MatchesView {
  competition: string;
  mode: string | null;
  matches: Match[];
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Programado',
  TIMED: 'Programado',
  IN_PLAY: 'En juego',
  PAUSED: 'Descanso',
  FINISHED: 'Finalizado',
  POSTPONED: 'Aplazado',
  SUSPENDED: 'Suspendido',
  CANCELED: 'Cancelado',
};

const DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-matches-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './matches-result.html',
  styleUrl: './matches-result.scss',
})
export class MatchesResult {
  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.square;

  protected readonly view = computed<MatchesView | null>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return null;
    return mapView(data as Record<string, unknown>);
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapView(d: Record<string, unknown>): MatchesView {
  const list = Array.isArray(d['matches']) ? d['matches'] : [];
  return {
    competition: str(d['competition']) ?? 'Partidos',
    mode: str(d['mode']),
    matches: list
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .map((m, i) => {
        const status = str(m['status']) ?? 'SCHEDULED';
        const utcDate = str(m['utcDate']);
        return {
          id: `${utcDate ?? i}-${i}`,
          utcDate,
          whenLabel: formatDate(utcDate),
          status,
          statusLabel: STATUS_LABEL[status] ?? status,
          matchday: num(m['matchday']),
          homeTeam: str(m['homeTeam']) ?? '—',
          homeCrest: str(m['homeCrest']),
          awayTeam: str(m['awayTeam']) ?? '—',
          awayCrest: str(m['awayCrest']),
          homeScore: num(m['homeScore']),
          awayScore: num(m['awayScore']),
          finished: status === 'FINISHED',
        };
      }),
  };
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return DATE_FORMAT.format(d);
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}
