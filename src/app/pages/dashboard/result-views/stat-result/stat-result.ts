import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApiInfo } from '../../../../core/models';

interface Stat {
  id: string;
  value: string;
  label: string;
  hint: string | null;
}

interface StatView {
  title: string | null;
  stats: Stat[];
  caption: string | null;
}

@Component({
  selector: 'app-stat-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stat-result.html',
  styleUrl: './stat-result.scss',
})
export class StatResult {
  readonly api = input.required<ApiInfo>();
  readonly data = input.required<unknown>();

  protected readonly view = computed<StatView>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return { title: null, stats: [], caption: null };
    return mapStats(this.api().id, data as Record<string, unknown>);
  });
}

function mapStats(id: string, d: Record<string, unknown>): StatView {
  switch (id) {
    case 'crypto': {
      const prices = d['prices'];
      if (!prices || typeof prices !== 'object') return { title: null, stats: [], caption: null };
      const entries = Object.entries(prices as Record<string, unknown>);
      const stats: Stat[] = [];
      for (const [coin, value] of entries) {
        if (!value || typeof value !== 'object') continue;
        for (const [currency, amount] of Object.entries(value as Record<string, unknown>)) {
          if (typeof amount !== 'number') continue;
          stats.push({
            id: `${coin}-${currency}`,
            value: formatCurrency(amount, currency),
            label: capitalize(coin),
            hint: currency.toUpperCase(),
          });
        }
      }
      return { title: null, stats, caption: null };
    }

    case 'exchange': {
      const base = (str(d['base']) ?? '').toUpperCase();
      const amount = num(d['amount']);
      const rates = d['rates'];
      const date = str(d['date']);
      const stats: Stat[] = [];
      if (rates && typeof rates === 'object') {
        for (const [currency, rate] of Object.entries(rates as Record<string, unknown>)) {
          if (typeof rate !== 'number') continue;
          stats.push({
            id: currency,
            value: formatNumber(rate, 4),
            label: `${base || '?'} → ${currency.toUpperCase()}`,
            hint: amount !== null && amount !== 1 ? `por ${formatNumber(amount, 2)} ${base}` : null,
          });
        }
      }
      return { title: null, stats, caption: date ? `Tipos del ${date}` : null };
    }

    case 'weather': {
      const temp = num(d['temperature']);
      const tempUnit = str(d['temperatureUnit']) ?? '°C';
      const wind = num(d['windSpeed']);
      const windUnit = str(d['windSpeedUnit']) ?? 'km/h';
      const code = num(d['weatherCode']);
      const condition = code !== null ? weatherLabel(code) : null;
      const locationName = str(d['locationName']);
      const lat = num(d['latitude']);
      const lon = num(d['longitude']);
      const stats: Stat[] = [];
      if (temp !== null) {
        stats.push({
          id: 'temp',
          value: `${formatNumber(temp, 1)} ${tempUnit}`,
          label: 'Temperatura',
          hint: condition,
        });
      }
      if (wind !== null) {
        stats.push({
          id: 'wind',
          value: `${formatNumber(wind, 1)} ${windUnit}`,
          label: 'Viento',
          hint: null,
        });
      }
      const coords =
        lat !== null && lon !== null
          ? `Lat ${formatNumber(lat, 2)}, Lon ${formatNumber(lon, 2)}`
          : null;
      return { title: locationName, stats, caption: locationName ? coords : null };
    }

    default:
      return { title: null, stats: [], caption: null };
  }
}

function weatherLabel(code: number): string {
  if (code === 0) return '☀️ Despejado';
  if (code <= 2) return '🌤️ Parcialmente nublado';
  if (code === 3) return '☁️ Nublado';
  if (code <= 48) return '🌫️ Niebla';
  if (code <= 57) return '🌦️ Llovizna';
  if (code <= 67) return '🌧️ Lluvia';
  if (code <= 77) return '🌨️ Nieve';
  if (code <= 82) return '🌧️ Chubascos';
  if (code <= 86) return '🌨️ Chubascos de nieve';
  return '⛈️ Tormenta';
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function formatNumber(value: number, decimals: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
  } catch {
    return `${formatNumber(value, 6)} ${currency.toUpperCase()}`;
  }
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
