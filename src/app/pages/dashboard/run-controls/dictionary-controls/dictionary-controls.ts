import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RunParams } from '../../../../core/api.service';

const ENGLISH_WORD = /^[a-zA-Z'-]+$/;
const HINT_TEXT =
  'Free Dictionary solo acepta una palabra en inglés (p. ej. hello, code, run).';

@Component({
  selector: 'app-dictionary-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './dictionary-controls.html',
  styleUrl: '../run-controls.scss',
})
export class DictionaryControls {
  readonly search = output<RunParams>();

  protected readonly word = signal('hello');
  protected readonly showHint = signal(false);

  protected readonly invalid = computed(() => {
    const value = this.word().trim();
    if (!value) return false;
    return !ENGLISH_WORD.test(value);
  });

  protected readonly hint = HINT_TEXT;

  protected submit(): void {
    const value = this.word().trim();
    if (!value || this.invalid()) {
      this.showHint.set(true);
      return;
    }
    this.showHint.set(false);
    this.search.emit({ path: { word: value } });
  }

  protected onInput(value: string): void {
    this.word.set(value);
    if (this.showHint() && (!value.trim() || !this.invalid())) {
      this.showHint.set(false);
    }
  }
}
