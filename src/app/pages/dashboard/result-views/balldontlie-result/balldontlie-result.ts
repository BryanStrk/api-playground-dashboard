import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';

export interface Stadium {
  id: number | string;
  name: string;
  city: string | null;
  country: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Team {
  id: number | string;
  name: string;
  abbreviation: string | null;
  countryCode: string | null;
  confederation: string;
  flag: string;
}

export interface ConfederationGroup {
  id: string;
  label: string;
  teams: Team[];
}

export interface Tier {
  id: string;
  name: string;
  price: string;
  rateLimit: string;
  features: string[];
  highlight: boolean;
}

export type PremiumKind = 'standings' | 'matches' | 'players';

export interface ProbeMeta {
  id: PremiumKind;
  label: string;
  icon: string;
  path: string;
  hint: string;
}

export interface PaywallInfo {
  requiredPlan: string | null;
  feature: string | null;
  message: string;
}

export interface ProbeState {
  status: 'idle' | 'loading' | 'data' | 'locked' | 'error';
  data: unknown;
  paywall: PaywallInfo | null;
  errorMessage: string | null;
}

export const BALLDONTLIE_UPGRADE_URL = 'https://app.balldontlie.io';

export interface PremiumStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface PremiumMatch {
  id: string;
  date: string | null;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
}

export interface PremiumPlayer {
  id: string;
  name: string;
  position: string | null;
  countryCode: string | null;
  flag: string;
  age: number | null;
}

const PROBES: ProbeMeta[] = [
  {
    id: 'standings',
    label: 'Clasificación',
    icon: '📊',
    path: '/balldontlie/standings',
    hint: 'Tabla de la fase de grupos',
  },
  {
    id: 'matches',
    label: 'Partidos',
    icon: '🎯',
    path: '/balldontlie/matches',
    hint: 'Calendario completo en vivo',
  },
  {
    id: 'players',
    label: 'Jugadores',
    icon: '🧑‍🦱',
    path: '/balldontlie/players',
    hint: 'Plantillas con perfil deportivo',
  },
];

const INITIAL_PROBE: ProbeState = {
  status: 'idle',
  data: null,
  paywall: null,
  errorMessage: null,
};

const CONFEDERATION_ORDER: { id: string; label: string }[] = [
  { id: 'UEFA', label: 'UEFA' },
  { id: 'CONMEBOL', label: 'CONMEBOL' },
  { id: 'CONCACAF', label: 'CONCACAF' },
  { id: 'CAF', label: 'CAF' },
  { id: 'AFC', label: 'AFC' },
  { id: 'OFC', label: 'OFC' },
];

const PLACEHOLDER_FLAG = '⚽';

type Tab = 'stadiums' | 'teams' | 'live';

const TAB_LABELS: { id: Tab; label: string; icon: string }[] = [
  { id: 'stadiums', label: 'Sedes', icon: '🏟️' },
  { id: 'teams', label: 'Equipos', icon: '🌍' },
  { id: 'live', label: 'Datos Live', icon: '🔒' },
];

const CAPACITY_FORMAT = new Intl.NumberFormat('es-ES');

@Component({
  selector: 'app-balldontlie-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './balldontlie-result.html',
  styleUrl: './balldontlie-result.scss',
})
export class BalldontlieResult implements AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = TAB_LABELS;
  protected readonly tab = signal<Tab>('stadiums');

  protected readonly stadiums = signal<Stadium[]>([]);
  protected readonly loadingStadiums = signal(false);
  protected readonly stadiumsError = signal<string | null>(null);

  protected readonly teams = signal<Team[]>([]);
  protected readonly loadingTeams = signal(false);
  protected readonly teamsError = signal<string | null>(null);
  protected readonly confederationFilter = signal<string>('');

  protected readonly confederationGroups = computed<ConfederationGroup[]>(() =>
    buildConfederationGroups(this.teams()),
  );

  protected readonly availableConfederations = computed<string[]>(() =>
    this.confederationGroups().map((g) => g.id),
  );

  protected readonly visibleGroups = computed<ConfederationGroup[]>(() => {
    const filter = this.confederationFilter();
    const groups = this.confederationGroups();
    if (!filter) return groups;
    return groups.filter((g) => g.id === filter);
  });

  protected readonly probes = PROBES;

  protected readonly tiers = signal<Tier[]>([]);
  protected readonly loadingTiers = signal(false);
  protected readonly tiersError = signal<string | null>(null);

  protected readonly probeStates = signal<Record<PremiumKind, ProbeState>>({
    standings: { ...INITIAL_PROBE },
    matches: { ...INITIAL_PROBE },
    players: { ...INITIAL_PROBE },
  });

  private readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');
  private mapInstance: unknown = null;
  private mapMarkers: unknown[] = [];

  constructor() {
    this.loadStadiums();
    this.loadTeams();
    this.loadTiers();
    effect(() => {
      const list = this.stadiums();
      const onTab = this.tab() === 'stadiums';
      if (onTab && list.length > 0) {
        queueMicrotask(() => this.ensureMap(list));
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.tab() === 'stadiums' && this.stadiums().length > 0) {
      this.ensureMap(this.stadiums());
    }
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

  protected formatCapacity(capacity: number | null): string {
    if (capacity === null) return '—';
    return CAPACITY_FORMAT.format(capacity);
  }

  protected mapLink(s: Stadium): string | null {
    if (s.latitude === null || s.longitude === null) return null;
    return `https://www.google.com/maps?q=${s.latitude},${s.longitude}`;
  }

  protected setConfederation(value: string): void {
    if (this.confederationFilter() === value) return;
    this.confederationFilter.set(value);
  }

  protected probeState(kind: PremiumKind): ProbeState {
    return this.probeStates()[kind];
  }

  protected readonly upgradeUrl = BALLDONTLIE_UPGRADE_URL;

  protected runProbe(kind: PremiumKind): void {
    const current = this.probeState(kind);
    if (current.status === 'loading') return;
    this.updateProbe(kind, {
      status: 'loading',
      data: null,
      paywall: null,
      errorMessage: null,
    });
    const meta = PROBES.find((p) => p.id === kind);
    if (!meta) return;
    this.http
      .get<unknown>(`${environment.apiBaseUrl}${meta.path}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          this.updateProbe(kind, {
            status: 'data',
            data: shapeProbeData(kind, raw),
            paywall: null,
            errorMessage: null,
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 402) {
            this.updateProbe(kind, {
              status: 'locked',
              data: null,
              paywall: extractPaywall(err, meta.label),
              errorMessage: null,
            });
            return;
          }
          this.updateProbe(kind, {
            status: 'error',
            data: null,
            paywall: null,
            errorMessage: 'No se pudo completar la llamada al endpoint.',
          });
        },
      });
  }

  protected resetProbe(kind: PremiumKind): void {
    this.updateProbe(kind, { ...INITIAL_PROBE });
  }

  protected standingsRows(state: ProbeState): PremiumStanding[] {
    return state.status === 'data' ? (state.data as PremiumStanding[]) : [];
  }

  protected matchesList(state: ProbeState): PremiumMatch[] {
    return state.status === 'data' ? (state.data as PremiumMatch[]) : [];
  }

  protected playersList(state: ProbeState): PremiumPlayer[] {
    return state.status === 'data' ? (state.data as PremiumPlayer[]) : [];
  }

  private updateProbe(kind: PremiumKind, state: ProbeState): void {
    this.probeStates.update((all) => ({ ...all, [kind]: state }));
  }

  private loadStadiums(): void {
    this.loadingStadiums.set(true);
    this.stadiumsError.set(null);
    this.http
      .get<unknown>(`${environment.apiBaseUrl}/balldontlie/stadiums`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          this.stadiums.set(mapStadiums(raw));
          this.loadingStadiums.set(false);
        },
        error: () => {
          this.stadiums.set([]);
          this.loadingStadiums.set(false);
          this.stadiumsError.set('No se pudieron cargar las sedes.');
        },
      });
  }

  private loadTiers(): void {
    this.loadingTiers.set(true);
    this.tiersError.set(null);
    this.http
      .get<unknown>(`${environment.apiBaseUrl}/balldontlie/tiers`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          this.tiers.set(mapTiers(raw));
          this.loadingTiers.set(false);
        },
        error: () => {
          this.tiers.set([]);
          this.loadingTiers.set(false);
          this.tiersError.set('No se pudo cargar la tabla de planes.');
        },
      });
  }

  private loadTeams(): void {
    this.loadingTeams.set(true);
    this.teamsError.set(null);
    this.http
      .get<unknown>(`${environment.apiBaseUrl}/balldontlie/teams`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          this.teams.set(mapTeams(raw));
          this.loadingTeams.set(false);
        },
        error: () => {
          this.teams.set([]);
          this.loadingTeams.set(false);
          this.teamsError.set('No se pudieron cargar los equipos.');
        },
      });
  }

  private async ensureMap(list: Stadium[]): Promise<void> {
    const host = this.mapHost()?.nativeElement;
    if (!host) return;
    const points = list.filter(hasCoords);
    if (points.length === 0) return;

    const L = await import('leaflet');
    const icon = pinIcon(L);

    if (!this.mapInstance) {
      const map = L.map(host, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      this.mapInstance = map;
    }

    const map = this.mapInstance as ReturnType<typeof L.map>;

    for (const marker of this.mapMarkers as ReturnType<typeof L.marker>[]) {
      marker.remove();
    }
    this.mapMarkers = [];

    const bounds = L.latLngBounds([]);
    for (const s of points) {
      const lat = s.latitude as number;
      const lng = s.longitude as number;
      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(popupHtml(s));
      this.mapMarkers.push(marker);
      bounds.extend([lat, lng]);
    }

    map.fitBounds(bounds, { padding: [30, 30] });
    queueMicrotask(() => map.invalidateSize());
  }
}

function hasCoords(s: Stadium): boolean {
  return s.latitude !== null && s.longitude !== null;
}

function pinIcon(L: typeof import('leaflet')) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">' +
    '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="#dc3545"/>' +
    '<circle cx="12" cy="12" r="4.5" fill="#fff"/>' +
    '</svg>';
  const iconUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  return L.icon({
    iconUrl,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -32],
  });
}

function popupHtml(s: Stadium): string {
  const lines: string[] = [`<strong>${escape(s.name)}</strong>`];
  const place = [s.city, s.country].filter(Boolean).join(', ');
  if (place) lines.push(escape(place));
  if (s.capacity !== null) lines.push(`Capacidad: ${CAPACITY_FORMAT.format(s.capacity)}`);
  return lines.join('<br>');
}

function escape(value: string | null): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mapTiers(raw: unknown): Tier[] {
  const list = arrayFrom(raw, ['tiers', 'plans', 'data']);
  return list
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((t, i) => mapTier(t, i))
    .sort((a, b) => priceWeight(a.price) - priceWeight(b.price));
}

function mapTier(t: Record<string, unknown>, index: number): Tier {
  const name = str(t['name']) ?? str(t['plan']) ?? `Plan ${index + 1}`;
  const priceRaw = num(t['price']) ?? num(t['monthlyPrice']);
  const price =
    priceRaw === null
      ? str(t['priceLabel']) ?? '—'
      : priceRaw === 0
        ? 'Gratis'
        : `$${priceRaw}/mes`;
  const rate =
    num(t['rateLimit']) ?? num(t['requestsPerMinute']) ?? num(t['rpm']);
  const rateLimit = rate === null ? str(t['rateLimitLabel']) ?? '—' : `${rate} req/min`;
  const features = extractStrings(t['features']);
  return {
    id: (str(t['id']) ?? name) as string,
    name,
    price,
    rateLimit,
    features,
    highlight: /all.?star/i.test(name),
  };
}

function priceWeight(price: string): number {
  if (price === 'Gratis') return 0;
  const m = price.match(/[\d.]+/);
  return m ? Number(m[0]) : 999;
}

function extractStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0);
}

function extractPaywall(err: HttpErrorResponse, fallbackFeature: string): PaywallInfo {
  const body = err.error;
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  return {
    requiredPlan: str(record['requiredPlan']) ?? str(record['plan']),
    feature: str(record['feature']) ?? fallbackFeature,
    message:
      str(record['message']) ??
      'Este endpoint requiere un plan de pago de BALLDONTLIE.',
  };
}

function shapeProbeData(kind: PremiumKind, raw: unknown): unknown {
  const list = arrayFrom(raw, [kind, 'data', 'items']);
  if (kind === 'standings') return list.map(mapPremiumStanding);
  if (kind === 'matches') return list.map(mapPremiumMatch);
  return list.map(mapPremiumPlayer);
}

function mapPremiumStanding(value: unknown): PremiumStanding {
  const r = (value as Record<string, unknown>) ?? {};
  return {
    team:
      str(r['team']) ??
      str((r['team'] as Record<string, unknown>)?.['name']) ??
      str(r['teamName']) ??
      '—',
    played: num(r['played']) ?? 0,
    won: num(r['won']) ?? num(r['wins']) ?? 0,
    drawn: num(r['drawn']) ?? num(r['draws']) ?? 0,
    lost: num(r['lost']) ?? num(r['losses']) ?? 0,
    goalsFor: num(r['goalsFor']) ?? num(r['gf']) ?? 0,
    goalsAgainst: num(r['goalsAgainst']) ?? num(r['ga']) ?? 0,
    points: num(r['points']) ?? num(r['pts']) ?? 0,
  };
}

function mapPremiumMatch(value: unknown): PremiumMatch {
  const m = (value as Record<string, unknown>) ?? {};
  return {
    id: (str(m['id']) ?? Math.random().toString(36).slice(2)) as string,
    date: str(m['date']) ?? str(m['datetime']) ?? str(m['utcDate']),
    home: str(m['homeTeam']) ?? str(m['home']) ?? '—',
    away: str(m['awayTeam']) ?? str(m['away']) ?? '—',
    homeScore: num(m['homeScore']) ?? num(m['home_score']),
    awayScore: num(m['awayScore']) ?? num(m['away_score']),
    status: str(m['status']),
  };
}

function mapPremiumPlayer(value: unknown): PremiumPlayer {
  const p = (value as Record<string, unknown>) ?? {};
  const code = str(p['country_code']) ?? str(p['countryCode']);
  return {
    id: (str(p['id']) ?? str(p['name']) ?? Math.random().toString(36).slice(2)) as string,
    name: str(p['name']) ?? '—',
    position: str(p['position']),
    countryCode: code,
    flag: code ? isoToFlagEmoji(code) : PLACEHOLDER_FLAG,
    age: num(p['age']),
  };
}

function mapTeams(raw: unknown): Team[] {
  const list = arrayFrom(raw, ['teams', 'data']);
  return list
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((t, i) => mapTeam(t, i));
}

function mapTeam(t: Record<string, unknown>, index: number): Team {
  const countryCode = str(t['country_code']) ?? str(t['countryCode']);
  const confederation =
    str(t['confederation']) ?? str(t['conf']) ?? 'Otros';
  return {
    id: (str(t['id']) ?? index) as string | number,
    name: str(t['name']) ?? 'Equipo',
    abbreviation: str(t['abbreviation']) ?? str(t['abbr']),
    countryCode,
    confederation: confederation.toUpperCase(),
    flag: countryCode ? isoToFlagEmoji(countryCode) : PLACEHOLDER_FLAG,
  };
}

function buildConfederationGroups(teams: Team[]): ConfederationGroup[] {
  const buckets = new Map<string, Team[]>();
  for (const team of teams) {
    if (!buckets.has(team.confederation)) buckets.set(team.confederation, []);
    buckets.get(team.confederation)!.push(team);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }
  const ordered: ConfederationGroup[] = [];
  for (const { id, label } of CONFEDERATION_ORDER) {
    const list = buckets.get(id);
    if (list && list.length > 0) {
      ordered.push({ id, label, teams: list });
      buckets.delete(id);
    }
  }
  for (const [id, list] of buckets.entries()) {
    ordered.push({ id, label: id, teams: list });
  }
  return ordered;
}

function isoToFlagEmoji(code: string): string {
  const iso = code.trim().toUpperCase();
  if (iso.length !== 2) return PLACEHOLDER_FLAG;
  const A = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  const first = iso.charCodeAt(0) - a + A;
  const second = iso.charCodeAt(1) - a + A;
  return String.fromCodePoint(first, second);
}

function mapStadiums(raw: unknown): Stadium[] {
  const list = arrayFrom(raw, ['stadiums', 'data']);
  return list
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s, i) => mapStadium(s, i));
}

function mapStadium(s: Record<string, unknown>, index: number): Stadium {
  return {
    id: (str(s['id']) ?? index) as string | number,
    name: str(s['name']) ?? 'Sede',
    city: str(s['city']),
    country: str(s['country']),
    capacity: num(s['capacity']),
    latitude: num(s['latitude']) ?? num(s['lat']),
    longitude: num(s['longitude']) ?? num(s['lng']) ?? num(s['lon']),
  };
}

function arrayFrom(raw: unknown, keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    for (const k of keys) {
      const value = record[k];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
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
