import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface GenerateResponse {
  text: string;
  model: string;
  totalTokens: number | null;
}

@Component({
  selector: 'app-chat-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './chat-result.html',
  styleUrl: './chat-result.scss',
})
export class ChatResult implements AfterViewChecked {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollHost = viewChild<ElementRef<HTMLElement>>('scrollHost');

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly draft = signal('');
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  private shouldScroll = false;

  ngAfterViewChecked(): void {
    if (!this.shouldScroll) return;
    this.shouldScroll = false;
    const host = this.scrollHost()?.nativeElement;
    if (host) host.scrollTop = host.scrollHeight;
  }

  protected send(): void {
    if (this.sending()) return;
    const text = this.draft().trim();
    if (!text) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const history = [...this.messages(), userMsg];
    this.messages.set(history);
    this.draft.set('');
    this.sending.set(true);
    this.error.set(null);
    this.shouldScroll = true;

    this.http
      .post<GenerateResponse>(`${environment.apiBaseUrl}/ai/chat`, {
        messages: history,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.messages.set([
            ...this.messages(),
            { role: 'model', text: res?.text ?? '' },
          ]);
          this.sending.set(false);
          this.shouldScroll = true;
        },
        error: (err: HttpErrorResponse) => {
          this.sending.set(false);
          this.error.set(this.errorMessageFor(err));
        },
      });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return;
    event.preventDefault();
    this.send();
  }

  protected reset(): void {
    if (this.sending()) return;
    this.messages.set([]);
    this.error.set(null);
  }

  protected retryLast(): void {
    this.error.set(null);
    const last = this.messages()[this.messages().length - 1];
    if (!last || last.role !== 'user') return;
    this.sending.set(true);
    this.http
      .post<GenerateResponse>(`${environment.apiBaseUrl}/ai/chat`, {
        messages: this.messages(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.messages.set([
            ...this.messages(),
            { role: 'model', text: res?.text ?? '' },
          ]);
          this.sending.set(false);
          this.shouldScroll = true;
        },
        error: (err: HttpErrorResponse) => {
          this.sending.set(false);
          this.error.set(this.errorMessageFor(err));
        },
      });
  }

  private errorMessageFor(err: HttpErrorResponse): string {
    if (err.status === 502 || err.status === 503) {
      return 'El modelo está ocupado, reinténtalo en unos segundos.';
    }
    if (err.status === 429) {
      return 'Límite de Gemini alcanzado, espera un momento antes de reintentar.';
    }
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      return String((body as { message: unknown }).message ?? 'No se pudo enviar el mensaje.');
    }
    return 'No se pudo enviar el mensaje. Reinténtalo.';
  }
}
