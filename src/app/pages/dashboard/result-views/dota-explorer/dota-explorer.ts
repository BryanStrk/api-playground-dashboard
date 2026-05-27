import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime } from 'rxjs';

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
export type PrimaryAttr = 'agi' | 'str' | 'int' | 'all';
export type AttackType = 'Melee' | 'Ranged';

interface AttrInfo {
  id: PrimaryAttr;
  label: string;
  short: string;
}

const TAB_LABELS: { id: Tab; label: string; icon: string }[] = [
  { id: 'heroes', label: 'Héroes', icon: '🦸' },
  { id: 'matches', label: 'Partidas Pro', icon: '🏆' },
];

const ATTRS: AttrInfo[] = [
  { id: 'agi', label: 'Agilidad', short: 'AGI' },
  { id: 'str', label: 'Fuerza', short: 'STR' },
  { id: 'int', label: 'Inteligencia', short: 'INT' },
  { id: 'all', label: 'Universal', short: 'ALL' },
];

const ATTACKS: { id: AttackType; label: string }[] = [
  { id: 'Melee', label: 'Cuerpo a cuerpo' },
  { id: 'Ranged', label: 'A distancia' },
];

@Component({
  selector: 'app-dota-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './dota-explorer.html',
  styleUrl: './dota-explorer.scss',
})
export class DotaExplorer {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = TAB_LABELS;
  protected readonly attrs = ATTRS;
  protected readonly attacks = ATTACKS;
  protected readonly tab = signal<Tab>('heroes');

  protected readonly placeholder = IMAGE_PLACEHOLDER.square;

  protected readonly heroes = signal<DotaHero[]>([]);
  protected readonly loadingHeroes = signal(false);
  protected readonly heroesError = signal<string | null>(null);

  protected readonly activeAttrs = signal<Set<PrimaryAttr>>(new Set());
  protected readonly activeAttacks = signal<Set<AttackType>>(new Set());

  protected readonly searchInput = signal('');
  protected readonly searchTerm = signal('');
  private readonly searchInput$ = new Subject<string>();

  protected readonly filteredHeroes = computed<DotaHero[]>(() => {
    const attrs = this.activeAttrs();
    const attacks = this.activeAttacks();
    const term = this.searchTerm().trim().toLowerCase();
    return this.heroes().filter((h) => {
      if (attrs.size > 0 && !attrs.has(h.primaryAttr as PrimaryAttr)) return false;
      if (attacks.size > 0 && !attacks.has(h.attackType as AttackType)) return false;
      if (term && !h.localizedName.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  protected readonly hasFilters = computed(
    () =>
      this.activeAttrs().size > 0 ||
      this.activeAttacks().size > 0 ||
      this.searchTerm().trim().length > 0,
  );

  protected readonly matches = signal<ProMatch[]>([]);
  protected readonly loadingMatches = signal(false);
  protected readonly matchesError = signal<string | null>(null);

  constructor() {
    this.loadHeroes();
    this.loadMatches();
    this.searchInput$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(value));
  }

  protected onSearchChange(value: string): void {
    this.searchInput.set(value);
    this.searchInput$.next(value);
  }

  protected randomHero(): void {
    const list = this.filteredHeroes();
    if (list.length === 0) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    this.selectHero(pick);
  }

  protected selectHero(_hero: DotaHero): void {
    // Wired by the modal commit.
  }

  protected selectTab(tab: Tab): void {
    if (tab === this.tab()) return;
    this.tab.set(tab);
  }

  protected toggleAttr(attr: PrimaryAttr): void {
    this.activeAttrs.update((set) => toggleInSet(set, attr));
  }

  protected toggleAttack(attack: AttackType): void {
    this.activeAttacks.update((set) => toggleInSet(set, attack));
  }

  protected clearFilters(): void {
    this.activeAttrs.set(new Set());
    this.activeAttacks.set(new Set());
    this.searchInput.set('');
    this.searchTerm.set('');
  }

  protected isAttrActive(attr: PrimaryAttr): boolean {
    return this.activeAttrs().has(attr);
  }

  protected isAttackActive(attack: AttackType): boolean {
    return this.activeAttacks().has(attack);
  }

  protected attrLabel(attr: string): string {
    return ATTRS.find((a) => a.id === attr)?.label ?? attr;
  }

  protected attackLabel(attack: string): string {
    return ATTACKS.find((a) => a.id === attack)?.label ?? attack;
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

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
