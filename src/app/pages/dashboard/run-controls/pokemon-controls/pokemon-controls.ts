import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';
import { RunParams } from '../../../../core/api.service';

const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic',
  'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

interface PokemonTypeResponse {
  type: string;
  count: number;
  pokemon: string[];
}

@Component({
  selector: 'app-pokemon-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './pokemon-controls.html',
  styleUrls: ['../run-controls.scss', './pokemon-controls.scss'],
})
export class PokemonControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly types = POKEMON_TYPES;
  protected readonly name = signal('pikachu');
  protected readonly type = signal<string>('');
  protected readonly typeList = signal<string[] | null>(null);
  protected readonly loadingType = signal(false);
  protected readonly typeError = signal<string | null>(null);

  protected submit(): void {
    const type = this.type();
    if (type) {
      this.fetchType(type);
      return;
    }
    const value = this.name().trim();
    if (!value) return;
    this.search.emit({ path: { name: value } });
  }

  protected pickName(name: string): void {
    this.name.set(name);
    this.type.set('');
    this.typeList.set(null);
    this.search.emit({ path: { name } });
  }

  private fetchType(type: string): void {
    this.loadingType.set(true);
    this.typeError.set(null);
    this.typeList.set(null);
    this.http
      .get<PokemonTypeResponse>(`${environment.apiBaseUrl}/pokemon/type/${encodeURIComponent(type)}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.typeList.set(res.pokemon ?? []);
          this.loadingType.set(false);
        },
        error: () => {
          this.loadingType.set(false);
          this.typeError.set(`No se pudo obtener la lista del tipo "${type}".`);
        },
      });
  }
}
