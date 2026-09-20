import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssessmentQuestion } from '../../models/assessment.model';

@Component({
  selector: 'app-assessment-question-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assessment-question-card.html',
  styleUrl: './assessment-question-card.css',
})
export class AssessmentQuestionCard {
  question = input.required<AssessmentQuestion>();
  questionIndex = input.required<number>();
  totalQuestions = input.required<number>();
  selectedChoiceIndex = input<number | undefined>(undefined);

  choiceSelected = output<number>();
  next = output<void>();
  prev = output<void>();

  selectOption(idx: number): void {
    this.choiceSelected.emit(idx);
  }

  onPrev(): void {
    this.prev.emit();
  }

  onNext(): void {
    this.next.emit();
  }
}
