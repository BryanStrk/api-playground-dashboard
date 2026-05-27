import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

interface QrView {
  data: string;
  size: string;
  qrUrl: string;
}

@Component({
  selector: 'app-qr-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './qr-result.html',
  styleUrl: './qr-result.scss',
})
export class QrResult {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input.required<unknown>();

  protected readonly placeholder = IMAGE_PLACEHOLDER.square;

  protected readonly view = computed<QrView | null>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    const qrUrl = str(d['qrUrl']);
    if (!qrUrl) return null;
    return {
      data: str(d['data']) ?? '',
      size: str(d['size']) ?? '',
      qrUrl,
    };
  });

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }

  protected download(view: QrView): void {
    this.http
      .get(view.qrUrl, { responseType: 'blob' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `qr-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
      });
  }
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  return null;
}
