import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';

import { RunParams } from '../../../core/api.service';
import { ApiInfo, RunResult } from '../../../core/models';
import { AudioResult } from '../result-views/audio-result/audio-result';
import { BooksResult } from '../result-views/books-result/books-result';
import { CharactersResult } from '../result-views/characters-result/characters-result';
import { ChatResult } from '../result-views/chat-result/chat-result';
import { DotaExplorer } from '../result-views/dota-explorer/dota-explorer';
import { GalleryResult } from '../result-views/gallery-result/gallery-result';
import { HnResult } from '../result-views/hn-result/hn-result';
import { HolidaysResult } from '../result-views/holidays-result/holidays-result';
import { MealsResult } from '../result-views/meals-result/meals-result';
import { MediaResult } from '../result-views/media-result/media-result';
import { MoviesResult } from '../result-views/movies-result/movies-result';
import { QrResult } from '../result-views/qr-result/qr-result';
import { SpaceResult } from '../result-views/space-result/space-result';
import { SportsResult } from '../result-views/sports-result/sports-result';
import { StatResult } from '../result-views/stat-result/stat-result';
import { TextResult } from '../result-views/text-result/text-result';
import { TriviaGame } from '../result-views/trivia-game/trivia-game';
import { ResultViewType, viewTypeFor } from '../result-views/view-type';
import { RunControls, controlsKindFor } from '../run-controls/run-controls';

@Component({
  selector: 'app-run-offcanvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AudioResult,
    BooksResult,
    CharactersResult,
    ChatResult,
    DotaExplorer,
    GalleryResult,
    HnResult,
    HolidaysResult,
    MealsResult,
    MediaResult,
    MoviesResult,
    QrResult,
    RunControls,
    SpaceResult,
    SportsResult,
    StatResult,
    TextResult,
    TriviaGame,
  ],
  templateUrl: './run-offcanvas.html',
  styleUrl: './run-offcanvas.scss',
})
export class RunOffcanvas {
  readonly api = input<ApiInfo | null>(null);
  readonly result = input<RunResult | null>(null);
  readonly loading = input<boolean>(false);
  readonly search = output<RunParams>();

  protected readonly hasControls = computed(() => {
    const api = this.api();
    if (!api) return false;
    if (this.isChat() || this.isTrivia() || this.isDota()) return false;
    return controlsKindFor(api.id) !== 'none';
  });

  protected readonly isChat = computed(() => this.viewType() === 'CHAT');
  protected readonly isTrivia = computed(() => this.viewType() === 'TRIVIA');
  protected readonly isDota = computed(() => this.viewType() === 'DOTA');

  protected onSearch(params: RunParams): void {
    this.search.emit(params);
  }

  protected readonly prettyJson = computed(() => {
    const data = this.result()?.data;
    if (data === null || data === undefined) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  });

  protected readonly statusTone = computed(() => {
    const r = this.result();
    if (!r) return 'text-bg-secondary';
    if (r.httpStatus === 429) return 'text-bg-warning';
    if (!r.ok) return 'text-bg-danger';
    if (r.httpStatus >= 200 && r.httpStatus < 300) return 'text-bg-success';
    return 'text-bg-warning';
  });

  protected readonly isRateLimited = computed(() => this.result()?.httpStatus === 429);

  protected readonly rateLimitMessage = computed(() => {
    const id = this.api()?.id;
    if (id === 'crypto') {
      return 'Límite de CoinGecko alcanzado, espera unos segundos antes de reintentar.';
    }
    const name = this.api()?.name ?? 'la API';
    return `Límite de ${name} alcanzado, espera unos segundos antes de reintentar.`;
  });

  protected readonly softError = computed<string | null>(() => {
    const r = this.result();
    const id = this.api()?.id;
    if (!r || r.ok) return null;
    if (id === 'dictionary' && r.httpStatus === 404) {
      return 'Free Dictionary solo acepta una palabra en inglés (p. ej. hello, code, run).';
    }
    return null;
  });

  protected readonly viewType = computed<ResultViewType>(() => viewTypeFor(this.api()?.id));

  protected readonly tab = signal<'view' | 'json'>('view');
  protected readonly hasRichView = computed(() => this.viewType() !== 'RAW');

  constructor() {
    effect(() => {
      this.api();
      this.tab.set('view');
    });
  }

  protected selectTab(tab: 'view' | 'json'): void {
    this.tab.set(tab);
  }
}
