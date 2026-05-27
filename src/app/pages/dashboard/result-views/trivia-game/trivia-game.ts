import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../../environments/environment';

interface Category {
  id: number;
  name: string;
}

interface RawQuestion {
  category: string;
  type: 'multiple' | 'boolean' | string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}

interface Question extends RawQuestion {
  shuffled: string[];
}

interface Settings {
  categoryId: number | null;
  difficulty: '' | 'easy' | 'medium' | 'hard';
  type: '' | 'multiple' | 'boolean';
  amount: 5 | 10 | 15 | 20;
  timerSeconds: 0 | 15 | 30 | 60;
}

interface Breakdown {
  easy: { correct: number; total: number };
  medium: { correct: number; total: number };
  hard: { correct: number; total: number };
}

type Mode = 'setup' | 'loading' | 'playing' | 'final' | 'error';

const DEFAULT_SETTINGS: Settings = {
  categoryId: null,
  difficulty: '',
  type: '',
  amount: 10,
  timerSeconds: 0,
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

@Component({
  selector: 'app-trivia-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './trivia-game.html',
  styleUrl: './trivia-game.scss',
})
export class TriviaGame {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly answerButtons = viewChildren<ElementRef<HTMLButtonElement>>('answerBtn');

  protected readonly mode = signal<Mode>('setup');
  protected readonly settings = signal<Settings>({ ...DEFAULT_SETTINGS });
  protected readonly categories = signal<Category[]>([]);
  protected readonly loadError = signal<string | null>(null);

  protected readonly questions = signal<Question[]>([]);
  protected readonly currentIndex = signal(0);
  protected readonly selectedAnswer = signal<string | null>(null);
  protected readonly revealed = signal(false);
  protected readonly streak = signal(0);
  protected readonly maxStreak = signal(0);
  protected readonly correctCount = signal(0);
  protected readonly breakdown = signal<Breakdown>(emptyBreakdown());
  protected readonly feedbackMessage = signal('');

  protected readonly timerRemaining = signal(0);
  protected readonly timerTotal = signal(0);
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  private gameStartedAt = 0;
  private elapsedMs = 0;

  protected readonly amounts = [5, 10, 15, 20] as const;
  protected readonly timers = [0, 15, 30, 60] as const;

  protected readonly current = computed<Question | null>(() => {
    const q = this.questions();
    const i = this.currentIndex();
    return q[i] ?? null;
  });

  protected readonly timerProgress = computed(() => {
    const total = this.timerTotal();
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (this.timerRemaining() / total) * 100));
  });

  protected readonly progressLabel = computed(() => {
    const total = this.questions().length;
    if (total === 0) return '';
    return `Pregunta ${this.currentIndex() + 1}/${total}`;
  });

  constructor() {
    this.loadCategories();
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  protected timerLabel(): string {
    return String(Math.ceil(this.timerRemaining()));
  }

  protected difficultyLabel(d: string): string {
    return DIFFICULTY_LABEL[d] ?? d;
  }

  protected setCategory(value: string): void {
    const id = value ? Number(value) : null;
    this.settings.update((s) => ({ ...s, categoryId: Number.isFinite(id as number) ? id : null }));
  }

  protected setDifficulty(value: string): void {
    this.settings.update((s) => ({ ...s, difficulty: value as Settings['difficulty'] }));
  }

  protected setType(value: string): void {
    this.settings.update((s) => ({ ...s, type: value as Settings['type'] }));
  }

  protected setAmount(value: string): void {
    const n = Number(value);
    this.settings.update((s) => ({ ...s, amount: (n as Settings['amount']) ?? 10 }));
  }

  protected setTimer(value: string): void {
    const n = Number(value);
    this.settings.update((s) => ({ ...s, timerSeconds: (n as Settings['timerSeconds']) ?? 0 }));
  }

  protected start(): void {
    this.mode.set('loading');
    this.loadError.set(null);
    const s = this.settings();
    const params: Record<string, string | number> = { amount: s.amount };
    if (s.categoryId !== null) params['category'] = s.categoryId;
    if (s.difficulty) params['difficulty'] = s.difficulty;
    if (s.type) params['type'] = s.type;

    this.http
      .get<RawQuestion[]>(`${environment.apiBaseUrl}/trivia`, { params: params as Record<string, string> })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          if (!Array.isArray(raw) || raw.length === 0) {
            this.mode.set('error');
            this.loadError.set('No hay preguntas para esta combinación. Prueba otra.');
            return;
          }
          this.questions.set(raw.map((q) => prepareQuestion(q)));
          this.resetGameState();
          this.mode.set('playing');
          this.gameStartedAt = Date.now();
          this.startTimerIfNeeded();
        },
        error: () => {
          this.mode.set('error');
          this.loadError.set('No se pudieron cargar las preguntas. Reinténtalo.');
        },
      });
  }

  protected back(): void {
    this.stopTimer();
    this.mode.set('setup');
  }

  protected answer(option: string): void {
    if (this.revealed()) return;
    this.stopTimer();
    this.selectedAnswer.set(option);
    this.revealed.set(true);
    const q = this.current();
    if (!q) return;
    const correct = option === q.correctAnswer;
    this.applyOutcome(q, correct);
  }

  private applyOutcome(q: Question, correct: boolean): void {
    const difficulty = q.difficulty as keyof Breakdown;
    this.breakdown.update((b) => {
      const next = { ...b } as Breakdown;
      if (difficulty in next) {
        next[difficulty] = {
          correct: b[difficulty].correct + (correct ? 1 : 0),
          total: b[difficulty].total + 1,
        };
      }
      return next;
    });
    if (correct) {
      this.correctCount.update((n) => n + 1);
      this.streak.update((s) => {
        const next = s + 1;
        this.maxStreak.update((m) => Math.max(m, next));
        return next;
      });
      this.feedbackMessage.set('Correcto');
    } else {
      this.streak.set(0);
      this.feedbackMessage.set(`Incorrecto. Era: ${decodeHtml(q.correctAnswer)}`);
    }
  }

  protected next(): void {
    if (!this.revealed()) return;
    const total = this.questions().length;
    if (this.currentIndex() + 1 >= total) {
      this.finishGame();
      return;
    }
    this.currentIndex.update((i) => i + 1);
    this.selectedAnswer.set(null);
    this.revealed.set(false);
    this.feedbackMessage.set('');
    this.startTimerIfNeeded();
  }

  protected playAgain(): void {
    this.start();
  }

  protected isCorrectOption(option: string): boolean {
    const q = this.current();
    return !!q && q.correctAnswer === option && this.revealed();
  }

  protected isWrongPick(option: string): boolean {
    return this.revealed() && this.selectedAnswer() === option && !this.isCorrectOption(option);
  }

  protected onAnswerKeydown(event: KeyboardEvent, index: number): void {
    if (this.revealed()) return;
    const buttons = this.answerButtons();
    if (buttons.length === 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      buttons[(index + 1) % buttons.length].nativeElement.focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      buttons[(index - 1 + buttons.length) % buttons.length].nativeElement.focus();
    }
  }

  protected decode(value: string): string {
    return decodeHtml(value);
  }

  protected totalTimeLabel(): string {
    const totalSec = Math.round(this.elapsedMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0 ? `${m} min ${s} s` : `${s} s`;
  }

  protected categoryLabel(): string {
    const id = this.settings().categoryId;
    if (id === null) return 'Cualquier categoría';
    return this.categories().find((c) => c.id === id)?.name ?? 'Categoría';
  }

  protected difficultyChip(): string {
    const d = this.settings().difficulty;
    return d ? DIFFICULTY_LABEL[d] : 'Cualquier dificultad';
  }

  private finishGame(): void {
    this.stopTimer();
    this.elapsedMs = Date.now() - this.gameStartedAt;
    this.mode.set('final');
  }

  private resetGameState(): void {
    this.currentIndex.set(0);
    this.selectedAnswer.set(null);
    this.revealed.set(false);
    this.streak.set(0);
    this.maxStreak.set(0);
    this.correctCount.set(0);
    this.breakdown.set(emptyBreakdown());
    this.feedbackMessage.set('');
    this.elapsedMs = 0;
  }

  private startTimerIfNeeded(): void {
    this.stopTimer();
    const secs = this.settings().timerSeconds;
    if (secs <= 0) {
      this.timerRemaining.set(0);
      this.timerTotal.set(0);
      return;
    }
    this.timerRemaining.set(secs);
    this.timerTotal.set(secs);
    this.timerHandle = setInterval(() => {
      this.timerRemaining.update((r) => {
        const next = Math.max(0, r - 0.1);
        if (next <= 0) {
          this.stopTimer();
          this.handleTimeout();
        }
        return next;
      });
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  private handleTimeout(): void {
    if (this.revealed()) return;
    this.revealed.set(true);
    this.selectedAnswer.set(null);
    const q = this.current();
    if (!q) return;
    this.applyOutcome(q, false);
    this.feedbackMessage.set(`Se acabó el tiempo. Era: ${decodeHtml(q.correctAnswer)}`);
  }

  private loadCategories(): void {
    this.http
      .get<Category[]>(`${environment.apiBaseUrl}/trivia/categories`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          if (Array.isArray(list)) {
            this.categories.set(
              list
                .filter((c) => !!c?.name)
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
          }
        },
      });
  }
}

function prepareQuestion(q: RawQuestion): Question {
  const all = [q.correctAnswer, ...q.incorrectAnswers];
  return { ...q, shuffled: shuffle(all) };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function emptyBreakdown(): Breakdown {
  return {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  };
}

function decodeHtml(value: string): string {
  if (typeof document === 'undefined') return value;
  const el = document.createElement('textarea');
  el.innerHTML = value;
  return el.value;
}
