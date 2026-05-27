import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

type Tab = 'characters' | 'episodes' | 'locations';

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'characters', label: 'Personajes' },
  { id: 'episodes', label: 'Episodios' },
  { id: 'locations', label: 'Ubicaciones' },
];

const STATUSES = [
  { value: '', label: 'Cualquier estado' },
  { value: 'alive', label: 'Vivo' },
  { value: 'dead', label: 'Muerto' },
  { value: 'unknown', label: 'Desconocido' },
];

const GENDERS = [
  { value: '', label: 'Cualquier género' },
  { value: 'female', label: 'Femenino' },
  { value: 'male', label: 'Masculino' },
  { value: 'genderless', label: 'Sin género' },
  { value: 'unknown', label: 'Desconocido' },
];

@Component({
  selector: 'app-characters-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './characters-controls.html',
  styleUrls: ['../run-controls.scss', './characters-controls.scss'],
})
export class CharactersControls {
  readonly search = output<RunParams>();

  protected readonly tabs = TAB_LABELS;
  protected readonly statuses = STATUSES;
  protected readonly genders = GENDERS;

  protected readonly tab = signal<Tab>('characters');

  protected readonly name = signal('rick');
  protected readonly status = signal('');
  protected readonly species = signal('');
  protected readonly gender = signal('');

  protected readonly episodeQuery = signal('pilot');
  protected readonly locationQuery = signal('earth');

  protected selectTab(tab: Tab): void {
    if (tab === this.tab()) return;
    this.tab.set(tab);
  }

  protected hasFilters(): boolean {
    return !!(this.status() || this.species().trim() || this.gender());
  }

  protected submit(): void {
    switch (this.tab()) {
      case 'characters':
        this.submitCharacters();
        return;
      case 'episodes':
        this.submitEpisodes();
        return;
      case 'locations':
        this.submitLocations();
        return;
    }
  }

  protected randomCharacter(): void {
    this.search.emit({ endpoint: '/api/v1/characters/random' });
  }

  private submitCharacters(): void {
    const name = this.name().trim();
    if (name) {
      this.search.emit({
        endpoint: '/api/v1/characters/search',
        query: { name },
      });
      return;
    }
    if (this.hasFilters()) {
      this.search.emit({
        endpoint: '/api/v1/characters/list',
        query: {
          status: this.status() || null,
          species: this.species().trim() || null,
          gender: this.gender() || null,
        },
      });
      return;
    }
    this.search.emit({
      endpoint: '/api/v1/characters/list',
      query: {},
    });
  }

  private submitEpisodes(): void {
    const q = this.episodeQuery().trim();
    if (!q) return;
    this.search.emit({
      endpoint: '/api/v1/episodes/search',
      query: { q },
    });
  }

  private submitLocations(): void {
    const q = this.locationQuery().trim();
    if (!q) return;
    this.search.emit({
      endpoint: '/api/v1/locations/search',
      query: { q },
    });
  }
}
