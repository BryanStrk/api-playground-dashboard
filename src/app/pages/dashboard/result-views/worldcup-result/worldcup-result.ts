import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';

export interface WorldCupInfo {
  name: string | null;
  firstMatchDate: string | null;
  lastMatchDate: string | null;
  totalMatches: number | null;
  venues: string[];
}

type Tab = 'matches' | 'groups' | 'info';

const TAB_LABELS: { id: Tab; label: string; icon: string }[] = [
  { id: 'matches', label: 'Partidos', icon: '📅' },
  { id: 'groups', label: 'Grupos', icon: '🏆' },
  { id: 'info', label: 'Info & Sedes', icon: 'ℹ️' },
];

const COUNTDOWN_FORMAT = new Intl.NumberFormat('es-ES');

@Component({
  selector: 'app-worldcup-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './worldcup-result.html',
  styleUrl: './worldcup-result.scss',
})
export class WorldCupResult {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = TAB_LABELS;
  protected readonly tab = signal<Tab>('matches');

  protected readonly info = signal<WorldCupInfo | null>(null);
  protected readonly loadingInfo = signal(false);
  protected readonly infoError = signal<string | null>(null);

  protected readonly countdown = computed(() => {
    const info = this.info();
    if (!info?.firstMatchDate) return null;
    return computeCountdown(info.firstMatchDate);
  });

  constructor() {
    this.loadInfo();
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

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}
