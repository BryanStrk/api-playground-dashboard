import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ApiInfo } from '../../../../core/models';

interface AiView {
  kind: 'ai';
  text: string;
  meta: string | null;
}

interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example: string | null }[];
}

interface DictionaryView {
  kind: 'dictionary';
  word: string;
  phonetic: string | null;
  meanings: DictionaryMeaning[];
}

interface PostView {
  kind: 'post';
  title: string;
  body: string;
}

interface EmptyView {
  kind: 'empty';
}

type TextView = AiView | DictionaryView | PostView | EmptyView;

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
    return mapText(this.api().id, data as Record<string, unknown>);
  });
}

function mapText(id: string, d: Record<string, unknown>): TextView {
  switch (id) {
    case 'ai': {
      const text = str(d['text']) ?? '';
      const model = str(d['model']);
      const total = num(d['totalTokens']);
      const meta = [model, total !== null ? `${total} tokens` : null]
        .filter(Boolean)
        .join(' · ') || null;
      return { kind: 'ai', text, meta };
    }

    case 'dictionary': {
      const word = str(d['word']) ?? '';
      const phonetic = str(d['phonetic']);
      const meanings = Array.isArray(d['meanings'])
        ? d['meanings']
            .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
            .map((m) => ({
              partOfSpeech: str(m['partOfSpeech']) ?? '',
              definitions: Array.isArray(m['definitions'])
                ? m['definitions']
                    .filter((def): def is Record<string, unknown> => !!def && typeof def === 'object')
                    .map((def) => ({
                      definition: str(def['definition']) ?? '',
                      example: str(def['example']),
                    }))
                    .filter((def) => def.definition.length > 0)
                : [],
            }))
            .filter((m) => m.definitions.length > 0)
        : [];
      return { kind: 'dictionary', word, phonetic, meanings };
    }

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

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}
