import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { MatchesResult } from '../matches-result/matches-result';
import { StandingsResult } from '../standings-result/standings-result';
import { TeamsResult } from '../teams-result/teams-result';

type SportsKind = 'standings' | 'matches' | 'teams' | 'unknown';

@Component({
  selector: 'app-sports-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatchesResult, StandingsResult, TeamsResult],
  template: `
    @switch (kind()) {
      @case ('standings') { <app-standings-result [data]="data()" /> }
      @case ('matches') { <app-matches-result [data]="data()" /> }
      @case ('teams') { <app-teams-result [data]="data()" /> }
      @default {
        <p class="text-secondary mb-0">No hay datos que mostrar.</p>
      }
    }
  `,
})
export class SportsResult {
  readonly data = input.required<unknown>();

  protected readonly kind = computed<SportsKind>(() => {
    const data = this.data();
    if (!data || typeof data !== 'object') return 'unknown';
    const d = data as Record<string, unknown>;
    if (Array.isArray(d['table'])) return 'standings';
    if (Array.isArray(d['matches'])) return 'matches';
    if (Array.isArray(d['teams'])) return 'teams';
    return 'unknown';
  });
}
