import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiService } from '../../core/api.service';
import { ApiHealth, ApiInfo } from '../../core/models';
import { ApiCard } from './api-card/api-card';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApiCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly api = inject(ApiService);

  protected readonly catalog = signal<ApiInfo[]>([]);
  protected readonly health = signal<Map<string, ApiHealth>>(new Map());
  protected readonly checking = signal(false);
  protected readonly loadError = signal<string | null>(null);

  protected readonly filtered = computed(() => this.catalog());

  protected readonly summary = computed(() => {
    const total = this.catalog().length;
    let up = 0;
    let down = 0;
    let skipped = 0;
    for (const entry of this.health().values()) {
      if (entry.status === 'UP') up++;
      else if (entry.status === 'DOWN') down++;
      else if (entry.status === 'SKIPPED') skipped++;
    }
    return { total, up, down, skipped };
  });

  constructor() {
    this.api
      .getCatalog()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (catalog) => this.catalog.set(catalog),
        error: () =>
          this.loadError.set(
            'No se pudo cargar el catálogo. Comprueba que el backend está corriendo en http://localhost:8080.',
          ),
      });
  }

  protected onRun(api: ApiInfo): void {
    // Wired in Phase 4 — opens the JSON offcanvas.
    console.debug('run', api.id);
  }
}
