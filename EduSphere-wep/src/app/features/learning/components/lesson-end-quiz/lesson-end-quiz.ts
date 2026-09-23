import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizQuestion, QuizSubmitResponse } from '../../../video-quiz/models';

@Component({
  selector: 'app-lesson-end-quiz',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-end-quiz.html',
  styleUrl: './lesson-end-quiz.css',
})
export class LessonEndQuiz {
  readonly videoTitle = input<string>('Lesson quiz');
  readonly questions = input<QuizQuestion[]>([]);
  readonly loading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly submitting = input<boolean>(false);
  readonly result = input<QuizSubmitResponse | null>(null);

  readonly submitAnswers = output<Array<number | boolean>>();
  readonly backToVideo = output<void>();
  readonly reload = output<void>();

  readonly answers = signal<Record<number, number | boolean>>({});
  readonly currentIndex = signal(0);

  readonly currentQuestion = computed(() => this.questions()[this.currentIndex()] ?? null);
  readonly total = computed(() => this.questions().length);
  readonly answeredCount = computed(() => Object.keys(this.answers()).length);
  readonly canSubmit = computed(() => this.total() > 0 && this.answeredCount() === this.total());

  /** Show Reload only when load failed or returned no questions (not while answering / scored). */
  readonly showReload = computed(
    () => !this.loading() && !this.result() && (!!this.errorMessage() || this.total() === 0)
  );

  constructor() {
    effect(() => {
      this.questions();
      untracked(() => {
        this.answers.set({});
        this.currentIndex.set(0);
      });
    });
  }

  isTrueFalse(q: QuizQuestion | null): boolean {
    if (!q) return false;
    const t = String(q.type || '').toUpperCase();
    return t === 'TRUEFALSE' || t === 'TRUE_FALSE' || t === 'BOOLEAN';
  }

  selectAnswer(value: number | boolean): void {
    const idx = this.currentIndex();
    this.answers.update((prev) => ({ ...prev, [idx]: value }));
  }

  isSelected(value: number | boolean): boolean {
    return this.answers()[this.currentIndex()] === value;
  }

  prev(): void {
    if (this.currentIndex() > 0) this.currentIndex.update((i) => i - 1);
  }

  next(): void {
    if (this.currentIndex() < this.total() - 1) this.currentIndex.update((i) => i + 1);
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) return;
    const ordered = this.questions().map((_, i) => this.answers()[i]);
    this.submitAnswers.emit(ordered as Array<number | boolean>);
  }
}
