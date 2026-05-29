import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApiInfo } from '../../../../core/models';

interface PostView {
  kind: 'post';
  title: string;
  body: string;
}

interface EmptyView {
  kind: 'empty';
}

type TextView = PostView | EmptyView;

@Component({
  selector: 'app-text-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-result.html',
  styleUrl: './text-result.scss',
})
export class TextResult {
  readonly api = input.required<ApiInfo>();
  readonly data = input.required<unknown>();

  protected readonly view = computed<TextView>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return { kind: 'empty' };
    if (Array.isArray(data)) return { kind: 'empty' };
    return mapText(this.api().id, data as Record<string, unknown>);
  });
}

function mapText(id: string, d: Record<string, unknown>): TextView {
  switch (id) {
    case 'posts':
      return {
        kind: 'post',
        title: str(d['title']) ?? 'Sin título',
        body: str(d['body']) ?? '',
      };

    default:
      return { kind: 'empty' };
  }
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  if (typeof value === 'number') return String(value);
  return null;
}
