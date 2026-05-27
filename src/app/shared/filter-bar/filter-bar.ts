import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Difficulty } from '../../core/models';

export type DifficultyFilter = 'all' | Difficulty;
export type CategoryFilter = 'all' | string;

@Component({
  selector: 'app-filter-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class FilterBar {
  readonly query = model<string>('');
  readonly category = model<CategoryFilter>('all');
  readonly difficulty = model<DifficultyFilter>('all');

  readonly categories = input<string[]>([]);
  readonly resultCount = input<number>(0);
  readonly totalCount = input<number>(0);

  protected clear(): void {
    this.query.set('');
    this.category.set('all');
    this.difficulty.set('all');
  }
}
