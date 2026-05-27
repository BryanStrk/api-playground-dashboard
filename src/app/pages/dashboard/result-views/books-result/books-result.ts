import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

type EbookAccess = 'public' | 'borrowable' | 'no_ebook' | 'printdisabled' | 'unknown';

interface Book {
  id: string;
  workKey: string | null;
  title: string;
  author: string | null;
  year: number | null;
  coverUrl: string | null;
  iaId: string | null;
  ebookAccess: EbookAccess;
}

@Component({
  selector: 'app-books-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './books-result.html',
  styleUrl: './books-result.scss',
})
export class BooksResult {
  private readonly sanitizer = inject(DomSanitizer);

  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.poster;
  protected readonly selected = signal<Book | null>(null);

  protected readonly books = computed<Book[]>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return [];
    const list = (data as { books?: unknown }).books;
    if (!Array.isArray(list)) return [];
    return list
      .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
      .map((b, i) => mapBook(b, i));
  });

  protected readonly readerUrl = computed<SafeResourceUrl | null>(() => {
    const b = this.selected();
    if (!b || b.ebookAccess !== 'public' || !b.iaId) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://archive.org/embed/${encodeURIComponent(b.iaId)}`,
    );
  });

  constructor() {
    effect(() => {
      this.data();
      this.selected.set(null);
    });
  }

  protected select(book: Book): void {
    this.selected.set(book);
  }

  protected back(): void {
    this.selected.set(null);
  }

  protected openLibraryUrl(workKey: string | null): string | null {
    if (!workKey) return null;
    const path = workKey.startsWith('/') ? workKey : `/${workKey}`;
    return `https://openlibrary.org${path}`;
  }

  protected archiveDetailsUrl(iaId: string | null): string | null {
    if (!iaId) return null;
    return `https://archive.org/details/${encodeURIComponent(iaId)}`;
  }

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }
}

function mapBook(b: Record<string, unknown>, index: number): Book {
  const workKey = str(b['workKey']);
  return {
    id: workKey ?? str(b['iaId']) ?? `b${index}`,
    workKey,
    title: str(b['title']) ?? 'Sin título',
    author: str(b['author']),
    year: num(b['year']),
    coverUrl: str(b['coverUrl']),
    iaId: str(b['iaId']),
    ebookAccess: normaliseAccess(str(b['ebookAccess'])),
  };
}

function normaliseAccess(value: string | null): EbookAccess {
  switch (value) {
    case 'public':
    case 'borrowable':
    case 'no_ebook':
    case 'printdisabled':
      return value;
    default:
      return 'unknown';
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
