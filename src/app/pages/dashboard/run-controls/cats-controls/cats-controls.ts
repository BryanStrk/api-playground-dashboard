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

interface CatBreed {
  id: string;
  name: string;
}

@Component({
  selector: 'app-cats-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './cats-controls.html',
  styleUrl: '../run-controls.scss',
})
export class CatsControls {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = output<RunParams>();

  protected readonly breeds = signal<CatBreed[]>([]);
  protected readonly breed = signal<string>('');
  protected readonly loadingBreeds = signal(false);
  protected readonly breedsError = signal<string | null>(null);

  constructor() {
    this.loadBreeds();
  }

  protected submit(): void {
    const breed = this.breed();
    this.search.emit({ query: breed ? { breed } : {} });
  }

  private loadBreeds(): void {
    this.loadingBreeds.set(true);
    this.http
      .get<CatBreed[]>(`${environment.apiBaseUrl}/cats/breeds`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.breeds.set(
            (list ?? [])
              .filter((b) => !!b?.id && !!b?.name)
              .sort((a, b) => a.name.localeCompare(b.name, 'es')),
          );
          this.loadingBreeds.set(false);
        },
        error: () => {
          this.loadingBreeds.set(false);
          this.breedsError.set(
            'No se pudo cargar la lista de razas; puedes seguir pidiendo gatos aleatorios.',
          );
        },
      });
  }
}
