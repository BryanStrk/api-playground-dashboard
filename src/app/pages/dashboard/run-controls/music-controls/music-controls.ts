import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

const ENTITIES = [
  { value: 'song', label: 'Canción' },
  { value: 'album', label: 'Álbum' },
  { value: 'musicArtist', label: 'Artista' },
];

@Component({
  selector: 'app-music-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './music-controls.html',
  styleUrl: '../run-controls.scss',
})
export class MusicControls {
  readonly search = output<RunParams>();

  protected readonly entities = ENTITIES;
  protected readonly term = signal('daft punk');
  protected readonly entity = signal<string>('song');

  protected submit(): void {
    const term = this.term().trim();
    if (!term) return;
    this.search.emit({ query: { term, entity: this.entity() } });
  }
}
