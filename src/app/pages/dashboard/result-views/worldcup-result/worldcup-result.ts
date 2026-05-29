import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { TeamLabel, teamLabel } from './flags';

export interface WorldCupInfo {
  name: string | null;
  firstMatchDate: string | null;
  lastMatchDate: string | null;
  totalMatches: number | null;
  venues: string[];
}

export interface Goal {
  player: string;
  minute: number | null;
  marker: string;
  penalty: boolean;
  ownGoal: boolean;
}

export interface WorldCupMatch {
  id: string;
  round: string;
  group: string | null;
  venue: string | null;
  utcDate: string | null;
  whenLabel: string | null;
  timeLabel: string | null;
  played: boolean;
  home: TeamLabel;
  away: TeamLabel;
  homeScore: number | null;
  awayScore: number | null;
  homeGoals: Goal[];
  awayGoals: Goal[];
}

export interface MatchGroup {
  round: string;
  matches: WorldCupMatch[];
}

type Tab = 'matches' | 'groups' | 'info';
type StatusFilter = '' | 'upcoming' | 'played';

const TAB_LABELS: { id: Tab; label: string; icon: string }[] = [
  { id: 'matches', label: 'Partidos', icon: '📅' },
  { id: 'groups', label: 'Grupos', icon: '🏆' },
  { id: 'info', label: 'Info & Sedes', icon: 'ℹ️' },
];

const STATUS_CHIPS: { id: StatusFilter; label: string }[] = [
  { id: '', label: 'Todos' },
  { id: 'upcoming', label: 'Próximos' },
  { id: 'played', label: 'Jugados' },
];

const GROUP_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((letter) => ({
  value: `Group ${letter}`,
  label: `Grupo ${letter}`,
}));

const COUNTDOWN_FORMAT = new Intl.NumberFormat('es-ES');

const DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const TIME_FORMAT = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

@Component({
  selector: 'app-worldcup-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './worldcup-result.html',
  styleUrl: './worldcup-result.scss',
})
export class WorldCupResult {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = TAB_LABELS;
  protected readonly tab = signal<Tab>('matches');

  protected readonly statusChips = STATUS_CHIPS;
  protected readonly groupOptions = GROUP_OPTIONS;

  protected readonly info = signal<WorldCupInfo | null>(null);
  protected readonly loadingInfo = signal(false);
  protected readonly infoError = signal<string | null>(null);

  protected readonly matches = signal<WorldCupMatch[]>([]);
  protected readonly loadingMatches = signal(false);
  protected readonly matchesError = signal<string | null>(null);

  protected readonly teamInput = signal('');
  protected readonly teamTerm = signal('');
  protected readonly groupFilter = signal<string>('');
  protected readonly statusFilter = signal<StatusFilter>('');
  private readonly teamInput$ = new Subject<string>();

  protected readonly countdown = computed(() => {
    const info = this.info();
    if (!info?.firstMatchDate) return null;
    return computeCountdown(info.firstMatchDate);
  });

  protected readonly groupedMatches = computed<MatchGroup[]>(() => groupByRound(this.matches()));

  protected readonly hasFilters = computed(
    () =>
      this.teamTerm().trim().length > 0 ||
      this.groupFilter() !== '' ||
      this.statusFilter() !== '',
  );

  protected readonly totalMatches = computed(() => this.info()?.totalMatches ?? null);

  constructor() {
    this.loadInfo();
    this.loadMatches();
    this.teamInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.teamTerm.set(value);
        this.loadMatches();
      });
  }

  protected selectTab(tab: Tab): void {
    if (tab === this.tab()) return;
    this.tab.set(tab);
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    const total = this.tabs.length;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.tab.set(this.tabs[(index + 1) % total].id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.tab.set(this.tabs[(index - 1 + total) % total].id);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.tab.set(this.tabs[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.tab.set(this.tabs[total - 1].id);
    }
  }

  protected onTeamInput(value: string): void {
    this.teamInput.set(value);
    this.teamInput$.next(value.trim());
  }

  protected setGroup(value: string): void {
    if (this.groupFilter() === value) return;
    this.groupFilter.set(value);
    this.loadMatches();
  }

  protected setStatus(value: StatusFilter): void {
    if (this.statusFilter() === value) return;
    this.statusFilter.set(value);
    this.loadMatches();
  }

  protected clearFilters(): void {
    if (!this.hasFilters()) return;
    this.teamInput.set('');
    this.teamTerm.set('');
    this.groupFilter.set('');
    this.statusFilter.set('');
    this.loadMatches();
  }

  protected goalLine(goal: Goal): string {
    const minute = goal.minute !== null ? `${goal.minute}'` : '—';
    const marker = goal.marker ? ` ${goal.marker}` : '';
    return `${goal.player} (${minute})${marker}`;
  }

  protected relativeWhen(iso: string | null): string | null {
    if (!iso) return null;
    const target = new Date(iso);
    if (Number.isNaN(target.getTime())) return null;
    const diff = target.getTime() - Date.now();
    const abs = Math.abs(diff);
    if (abs < 60_000) return RELATIVE_FORMAT.format(Math.round(diff / 1000), 'second');
    if (abs < 3_600_000) return RELATIVE_FORMAT.format(Math.round(diff / 60_000), 'minute');
    if (abs < 86_400_000) return RELATIVE_FORMAT.format(Math.round(diff / 3_600_000), 'hour');
    return RELATIVE_FORMAT.format(Math.round(diff / 86_400_000), 'day');
  }

  private loadInfo(): void {
    this.loadingInfo.set(true);
    this.infoError.set(null);
    this.http
      .get<Record<string, unknown>>(`${environment.apiBaseUrl}/worldcup/info`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          this.info.set(mapInfo(raw ?? {}));
          this.loadingInfo.set(false);
        },
        error: () => {
          this.loadingInfo.set(false);
          this.infoError.set('No se pudo cargar la información del Mundial.');
        },
      });
  }

  private loadMatches(): void {
    this.loadingMatches.set(true);
    this.matchesError.set(null);
    let params = new HttpParams();
    if (this.teamTerm()) params = params.set('team', this.teamTerm());
    if (this.groupFilter()) params = params.set('group', this.groupFilter());
    if (this.statusFilter()) params = params.set('status', this.statusFilter());
    this.http
      .get<unknown>(`${environment.apiBaseUrl}/worldcup/matches`, { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          this.matches.set(mapMatches(raw));
          this.loadingMatches.set(false);
        },
        error: () => {
          this.matches.set([]);
          this.loadingMatches.set(false);
          this.matchesError.set('No se pudieron cargar los partidos.');
        },
      });
  }
}

export interface Countdown {
  state: 'before' | 'live' | 'finished';
  daysLeft: number;
  label: string;
}

function computeCountdown(firstMatchIso: string): Countdown | null {
  const target = new Date(firstMatchIso);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startOfTarget = startOfDay(target);
  const startOfToday = startOfDay(now);
  const diffMs = startOfTarget.getTime() - startOfToday.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft > 0) {
    return {
      state: 'before',
      daysLeft,
      label:
        daysLeft === 1
          ? 'Falta 1 día para el Mundial'
          : `Faltan ${COUNTDOWN_FORMAT.format(daysLeft)} días para el Mundial`,
    };
  }
  return {
    state: 'live',
    daysLeft: 0,
    label: '¡En juego!',
  };
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function mapInfo(d: Record<string, unknown>): WorldCupInfo {
  return {
    name: str(d['name']) ?? str(d['tournament']),
    firstMatchDate: str(d['firstMatchDate']) ?? str(d['firstMatch']),
    lastMatchDate: str(d['lastMatchDate']) ?? str(d['lastMatch']),
    totalMatches: num(d['totalMatches']) ?? num(d['matches']),
    venues: extractVenues(d['venues']),
  };
}

function extractVenues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string' && entry.trim()) {
      out.push(entry.trim());
      continue;
    }
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const name = str(record['name']) ?? str(record['venue']) ?? str(record['city']);
      if (name) out.push(name);
    }
  }
  return out;
}

function mapMatches(raw: unknown): WorldCupMatch[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>)['matches'])
      ? ((raw as Record<string, unknown>)['matches'] as unknown[])
      : [];
  return list
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m, i) => mapMatch(m, i));
}

function mapMatch(m: Record<string, unknown>, index: number): WorldCupMatch {
  const round = str(m['round']) ?? str(m['matchday']) ?? str(m['stage']) ?? 'Sin jornada';
  const utcDate = str(m['utcDate']) ?? str(m['date']) ?? str(m['datetime']);
  const status = (str(m['status']) ?? '').toLowerCase();
  const played =
    status === 'played' ||
    status === 'finished' ||
    isPlayedShape(m);
  const home = teamLabel(str(m['team1']) ?? str(m['homeTeam']) ?? str(m['home']));
  const away = teamLabel(str(m['team2']) ?? str(m['awayTeam']) ?? str(m['away']));
  return {
    id: str(m['id']) ?? `${utcDate ?? 'match'}-${index}`,
    round,
    group: str(m['group']),
    venue: str(m['venue']) ?? str(m['city']),
    utcDate,
    whenLabel: formatDate(utcDate),
    timeLabel: formatTime(utcDate),
    played,
    home,
    away,
    homeScore: scoreFor(m, ['score1', 'homeScore', 'home_score']),
    awayScore: scoreFor(m, ['score2', 'awayScore', 'away_score']),
    homeGoals: extractGoals(m['goals1'] ?? m['homeGoals']),
    awayGoals: extractGoals(m['goals2'] ?? m['awayGoals']),
  };
}

function isPlayedShape(m: Record<string, unknown>): boolean {
  const s1 = num(m['score1']) ?? num(m['homeScore']);
  const s2 = num(m['score2']) ?? num(m['awayScore']);
  return s1 !== null && s2 !== null;
}

function scoreFor(m: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = num(m[k]);
    if (v !== null) return v;
  }
  return null;
}

function extractGoals(value: unknown): Goal[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
    .map((g) => {
      const type = (str(g['type']) ?? str(g['kind']) ?? '').toLowerCase();
      const penalty = type === 'p' || type === 'penalty';
      const ownGoal = type === 'pp' || type === 'og' || type === 'own_goal';
      const marker = ownGoal ? '(pp)' : penalty ? '(P)' : '⚽';
      return {
        player: str(g['player']) ?? str(g['name']) ?? 'Jugador',
        minute: num(g['minute']) ?? num(g['min']),
        marker,
        penalty,
        ownGoal,
      };
    });
}

function groupByRound(matches: WorldCupMatch[]): MatchGroup[] {
  const grouped = new Map<string, WorldCupMatch[]>();
  for (const match of matches) {
    if (!grouped.has(match.round)) grouped.set(match.round, []);
    grouped.get(match.round)!.push(match);
  }
  const out: MatchGroup[] = [];
  for (const [round, list] of grouped.entries()) {
    list.sort((a, b) => compareDates(a.utcDate, b.utcDate));
    out.push({ round, matches: list });
  }
  return out;
}

function compareDates(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return DATE_FORMAT.format(d);
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return TIME_FORMAT.format(d);
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
