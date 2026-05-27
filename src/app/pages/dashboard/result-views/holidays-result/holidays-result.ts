import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Holiday {
  id: string;
  date: string;
  formattedDate: string | null;
  localName: string;
  internationalName: string | null;
  types: string[];
  countryCode: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

@Component({
  selector: 'app-holidays-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './holidays-result.html',
  styleUrl: './holidays-result.scss',
})
export class HolidaysResult {
  readonly data = input.required<unknown>();

  protected readonly holidays = computed<Holiday[]>(() => {
    const data = this.data();
    if (!Array.isArray(data)) return [];
    return data
      .filter((h): h is Record<string, unknown> => !!h && typeof h === 'object')
      .map((h, i) => mapHoliday(h, i))
      .filter((h) => h.date.length > 0);
  });
}

function mapHoliday(h: Record<string, unknown>, index: number): Holiday {
  const date = str(h['date']) ?? '';
  const localName = str(h['localName']) ?? str(h['name']) ?? 'Sin nombre';
  const international = str(h['name']);
  return {
    id: `${date}-${index}`,
    date,
    formattedDate: formatDate(date),
    localName,
    internationalName: international && international !== localName ? international : null,
    types: extractTypes(h['types']),
    countryCode: str(h['countryCode']) ?? '',
  };
}

function extractTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((t) => str(t))
    .filter((t): t is string => t !== null);
}

function formatDate(value: string): string | null {
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
