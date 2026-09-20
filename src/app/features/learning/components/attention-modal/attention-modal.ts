import { Component, computed, effect, input, OnDestroy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttentionQuestion } from '../../../attention-question/models';

@Component({
  selector: 'app-attention-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attention-modal.html',
  styleUrl: './attention-modal.css',
})
export class AttentionModal implements OnDestroy {
  readonly isOpen = input<boolean>(false);
  readonly question = input<AttentionQuestion | null>(null);
  readonly videoId = input<string>('');
  readonly position = input<'bottom-right' | 'bottom-left'>('bottom-right');

  readonly answered = output<{
    choiceIndex: number;
    answer: any;
    isCorrect: boolean;
    secondsTaken: number;
  }>();
  readonly penaltyRecorded = output<{ secondsTaken: number }>();
  readonly closed = output<void>();

  readonly secondsElapsed = signal<number>(0);
  readonly selectedAnswer = signal<any | null>(null);
  readonly isCorrect = signal<boolean | null>(null);
  readonly feedbackMessage = signal<string>('');

  private timerRef: any = null;
  private autoCloseRef: any = null;
  private recordedMinutes = 0;

  readonly formattedTimer = computed<string>(() => {
    const total = this.secondsElapsed();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  readonly isDelayed = computed<boolean>(() => this.secondsElapsed() >= 60);

  readonly penaltyPercentage = computed<number>(() => {
    const mins = Math.floor(this.secondsElapsed() / 60);
    return Math.min(100, mins * 10);
  });

  readonly isTrueFalse = computed<boolean>(() => {
    const t = (this.question()?.type || '').toUpperCase();
    return t === 'TRUEFALSE' || t === 'TRUE_FALSE' || t === 'BOOLEAN';
  });

  constructor() {
    effect(() => {
      if (this.isOpen() && this.question()) {
        this.startTimer();
      } else {
        this.clearTimer();
      }
    });
  }

  private startTimer(): void {
    this.clearTimer();
    this.secondsElapsed.set(0);
    this.recordedMinutes = 0;
    this.selectedAnswer.set(null);
    this.isCorrect.set(null);
    this.feedbackMessage.set('');

    this.timerRef = setInterval(() => {
      this.secondsElapsed.update((s) => s + 1);
      const currentSeconds = this.secondsElapsed();
      const currentMinutes = Math.floor(currentSeconds / 60);

      // For each elapsed minute beyond 60s, emit penalty event
      if (currentSeconds >= 60 && currentMinutes > this.recordedMinutes) {
        this.recordedMinutes = currentMinutes;
        this.penaltyRecorded.emit({ secondsTaken: 60 });
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
    if (this.autoCloseRef) {
      clearTimeout(this.autoCloseRef);
      this.autoCloseRef = null;
    }
  }

  selectChoice(val: any, index: number = -1): void {
    if (this.selectedAnswer() !== null) {
      return; // Already answered
    }

    this.clearTimer();
    const q = this.question();
    if (!q) return;

    let correct = false;
    const target = q.correctAnswer;

    if (this.isTrueFalse()) {
      const boolVal = typeof val === 'string' ? val.toLowerCase() === 'true' : Boolean(val);
      const boolTarget = typeof target === 'string' ? target.toLowerCase() === 'true' : Boolean(target);
      correct = boolVal === boolTarget;
    } else {
      // MCQ matching by index or string
      const numTarget = Number(target);
      if (!isNaN(numTarget) && index !== -1) {
        correct = index === numTarget;
      } else {
        correct = String(val).trim().toLowerCase() === String(target).trim().toLowerCase();
      }
    }

    this.selectedAnswer.set(val);
    this.isCorrect.set(correct);

    if (correct) {
      this.feedbackMessage.set('Correct! Attention confirmed ✓');
    } else {
      this.feedbackMessage.set('Incorrect! Please stay focused on the lesson.');
    }

    this.answered.emit({
      choiceIndex: index,
      answer: val,
      isCorrect: correct,
      secondsTaken: this.secondsElapsed(),
    });

    // Auto dismiss after 2.5 seconds
    this.autoCloseRef = setTimeout(() => {
      this.close();
    }, 2500);
  }

  close(): void {
    this.clearTimer();
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
