import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';
import { IMAGE_PLACEHOLDER, swapImageOnError } from '../image-fallback';

export interface DotaHero {
  id: number;
  name: string;
  localizedName: string;
  primaryAttr: string;
  attackType: string;
  roles: string[];
  imgUrl: string | null;
  iconUrl: string | null;
}

export interface ProMatch {
  matchId: number;
  leagueName: string | null;
  startTime: number;
  duration: number;
  radiantWin: boolean;
  radiantName: string | null;
  direName: string | null;
}

type Tab = 'heroes' | 'matches';

const TAB_LABELS: { id: Tab; label: string; icon: string }[] = [
  { id: 'heroes', label: 'Héroes', icon: '🦸' },
  { id: 'matches', label: 'Partidas Pro', icon: '🏆' },
];

@Component({
  selector: 'app-dota-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dota-explorer.html',
  styleUrl: './dota-explorer.scss',
})
export class DotaExplorer {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = TAB_LABELS;
  protected readonly tab = signal<Tab>('heroes');

  protected readonly placeholder = IMAGE_PLACEHOLDER.square;

  protected readonly heroes = signal<DotaHero[]>([]);
  protected readonly loadingHeroes = signal(false);
  protected readonly heroesError = signal<string | null>(null);

  protected readonly matches = signal<ProMatch[]>([]);
  protected readonly loadingMatches = signal(false);
  protected readonly matchesError = signal<string | null>(null);

  constructor() {
    this.loadHeroes();
    this.loadMatches();
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
    }
  }

  protected onImgError(event: Event): void {
    swapImageOnError(event, this.placeholder);
  }

  private loadHeroes(): void {
    this.loadingHeroes.set(true);
    this.heroesError.set(null);
    this.http
      .get<DotaHero[]>(`${environment.apiBaseUrl}/dota/heroes`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.heroes.set(Array.isArray(list) ? list : []);
          this.loadingHeroes.set(false);
        },
        error: () => {
          this.loadingHeroes.set(false);
          this.heroesError.set('No se pudieron cargar los héroes.');
        },
      });
  }

  private loadMatches(): void {
    this.loadingMatches.set(true);
    this.matchesError.set(null);
    this.http
      .get<ProMatch[]>(`${environment.apiBaseUrl}/dota/pro-matches`, {
        params: { limit: 20 },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.matches.set(Array.isArray(list) ? list : []);
          this.loadingMatches.set(false);
        },
        error: () => {
          this.loadingMatches.set(false);
          this.matchesError.set('No se pudieron cargar las partidas pro.');
        },
      });
  }
}
