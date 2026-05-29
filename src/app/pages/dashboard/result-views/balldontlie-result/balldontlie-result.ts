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
import { HttpClient } from '@angular/common/http';

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

  private readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');
  private mapInstance: unknown = null;
  private mapMarkers: unknown[] = [];

  constructor() {
    this.loadStadiums();
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
