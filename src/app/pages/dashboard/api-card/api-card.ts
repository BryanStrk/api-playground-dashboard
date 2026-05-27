import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ApiHealth, ApiInfo } from '../../../core/models';
import { StatusBadge } from '../../../shared/status-badge/status-badge';

@Component({
  selector: 'app-api-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge],
  templateUrl: './api-card.html',
  styleUrl: './api-card.scss',
})
export class ApiCard {
  readonly api = input.required<ApiInfo>();
  readonly health = input<ApiHealth | null>(null);
  readonly loading = input<boolean>(false);

  readonly run = output<ApiInfo>();

  onRun(): void {
    this.run.emit(this.api());
  }
}
