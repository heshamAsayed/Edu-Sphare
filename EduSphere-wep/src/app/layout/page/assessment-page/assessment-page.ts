import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Navbar } from '../../../features/home/components/navbar/navbar';
import { Footer } from '../../../features/home/components/footer/footer';
import {
  AssessmentQuestion,
  AssessmentQuestionCard,
  AssessmentResult,
  AssessmentResultData,
  AssessmentService,
  AssessmentSidebar,
} from '../../../features/assessment';

@Component({
  selector: 'app-assessment-page',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Footer,
    AssessmentSidebar,
    AssessmentQuestionCard,
    AssessmentResult,
  ],
  templateUrl: './assessment-page.html',
  styleUrl: './assessment-page.css',
})
export class AssessmentPage implements OnInit {
  private route = inject(ActivatedRoute);
  private assessmentService = inject(AssessmentService);

  courseId = signal<string | null>(null);
  questions = signal<AssessmentQuestion[]>([]);
  currentIndex = signal<number>(0);
  userAnswers = signal<Record<number, number>>({});
  isCompleted = signal<boolean>(false);
  resultData = signal<AssessmentResultData | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe(() => {
      const id =
        this.route.snapshot.paramMap.get('courseId') ||
        this.route.snapshot.queryParamMap.get('courseId');
      const videoId = this.route.snapshot.queryParamMap.get('videoId') || undefined;
      this.courseId.set(id);
      this.loadQuestions(id || undefined, videoId);
    });
  }

  loadQuestions(courseId?: string, videoId?: string): void {
    this.assessmentService.getQuestions(courseId, videoId).subscribe((qs) => {
      this.questions.set(qs);
      this.currentIndex.set(0);
      this.userAnswers.set({});
      this.isCompleted.set(false);
      this.resultData.set(null);
    });
  }

  onChoiceSelected(choiceIndex: number): void {
    this.userAnswers.update((prev) => ({
      ...prev,
      [this.currentIndex()]: choiceIndex,
    }));
  }

  onPrev(): void {
    const curr = this.currentIndex();
    if (curr > 0) {
      this.currentIndex.set(curr - 1);
    }
  }

  onNext(): void {
    const curr = this.currentIndex();
    const qs = this.questions();

    if (this.userAnswers()[curr] === undefined) {
      alert('Please select an answer first.');
      return;
    }

    if (curr < qs.length - 1) {
      this.currentIndex.set(curr + 1);
    } else {
      // Finish Quiz
      const result = this.assessmentService.evaluateScore(qs, this.userAnswers());
      this.resultData.set(result);
      this.isCompleted.set(true);
    }
  }

  onRetake(): void {
    this.currentIndex.set(0);
    this.userAnswers.set({});
    this.isCompleted.set(false);
    this.resultData.set(null);
  }
}
