import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Difficulty, HealthStatus, RequiresKey } from '../../core/models';

export type BadgeVariant = 'health' | 'difficulty' | 'key';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="badge rounded-pill d-inline-flex align-items-center gap-1"
      [class]="modifier()"
      [attr.aria-label]="ariaLabel()"
      [attr.role]="loading() ? 'status' : null"
    >
      @if (loading()) {
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <span>Checking…</span>
      } @else {
        <span class="badge-dot" aria-hidden="true"></span>
        <span>{{ label() }}</span>
        @if (variant() === 'health' && responseTimeMs() !== null) {
          <span class="badge-meta">· {{ responseTimeMs() }} ms</span>
        }
      }
    </span>
  `,
  styleUrl: './status-badge.scss',
})
export class StatusBadge {
  readonly variant = input<BadgeVariant>('health');
  readonly status = input<HealthStatus | null>(null);
  readonly difficulty = input<Difficulty | null>(null);
  readonly requiresKey = input<RequiresKey | null>(null);
  readonly responseTimeMs = input<number | null>(null);
  readonly loading = input<boolean>(false);

  protected readonly label = computed(() => {
    switch (this.variant()) {
      case 'health':
        return this.status() ?? 'PENDING';
      case 'difficulty':
        return DIFFICULTY_LABEL[this.difficulty() ?? 'EASY'];
      case 'key':
        return KEY_LABEL[this.requiresKey() ?? 'NONE'];
    }
  });

  protected readonly modifier = computed(() => {
    if (this.loading()) return 'badge--pending';
    switch (this.variant()) {
      case 'health':
        return `badge--${(this.status() ?? 'pending').toLowerCase()}`;
      case 'difficulty':
        return `badge--diff-${(this.difficulty() ?? 'easy').toLowerCase()}`;
      case 'key':
        return `badge--key-${(this.requiresKey() ?? 'none').toLowerCase()}`;
    }
  });

  protected readonly ariaLabel = computed(() => {
    if (this.loading()) return 'Comprobando estado';
    switch (this.variant()) {
      case 'health': {
        const ms = this.responseTimeMs();
        const tail = ms !== null ? ` en ${ms} milisegundos` : '';
        return `Estado: ${this.label()}${tail}`;
      }
      case 'difficulty':
        return `Dificultad: ${this.label()}`;
      case 'key':
        return `API key: ${this.label()}`;
    }
  });
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: 'Fácil',
  MEDIUM: 'Media',
  HARD: 'Difícil',
};

const KEY_LABEL: Record<RequiresKey, string> = {
  NONE: 'Sin key',
  OPTIONAL: 'Key opcional',
  REQUIRED: 'Key requerida',
};
