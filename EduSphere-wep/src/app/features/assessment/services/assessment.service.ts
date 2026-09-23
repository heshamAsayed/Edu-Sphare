import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AssessmentQuestion, AssessmentResultData } from '../models/assessment.model';
import { VideoQuizService } from '../../video-quiz/video-quiz.service';
import { QuizQuestion } from '../../video-quiz/models';

@Injectable({
  providedIn: 'root',
})
export class AssessmentService {
  private readonly videoQuiz = inject(VideoQuizService);

  private defaultQuestions: AssessmentQuestion[] = [
    {
      title: 'Which data type is typically used to store text such as a student name?',
      options: ['Integer', 'String', 'Boolean', 'Array'],
      correctIndex: 1,
    },
    {
      title: 'Which keyword is used to declare a constant in most modern programming languages?',
      options: ['var', 'let', 'const', 'static'],
      correctIndex: 2,
    },
    {
      title: 'Which of the following represents a loop structure?',
      options: ['if / else', 'switch', 'for', 'try / catch'],
      correctIndex: 2,
    },
  ];

  getQuestions(courseId?: string, videoId?: string): Observable<AssessmentQuestion[]> {
    if (videoId) {
      return this.videoQuiz.generateQuiz(videoId).pipe(
        map((res) => (res.questions || []).map((q) => this.mapQuizQuestion(q))),
        catchError(() => of([...this.defaultQuestions]))
      );
    }
    return of([...this.defaultQuestions]);
  }

  evaluateScore(questions: AssessmentQuestion[], userAnswers: Record<number, number>): AssessmentResultData {
    let correct = 0;
    questions.forEach((q, i) => {
      if (userAnswers[i] === q.correctIndex) {
        correct++;
      }
    });

    return {
      totalQuestions: questions.length,
      correctAnswers: correct,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
    };
  }

  private mapQuizQuestion(q: QuizQuestion): AssessmentQuestion {
    const type = String(q.type || '').toUpperCase();
    const isTf = type === 'TRUEFALSE' || type === 'TRUE_FALSE' || type === 'BOOLEAN';

    if (isTf) {
      const correct =
        typeof q.correctAnswer === 'boolean'
          ? q.correctAnswer
          : String(q.correctAnswer).toLowerCase() === 'true';
      return {
        title: q.question,
        options: ['True (صح)', 'False (خطأ)'],
        correctIndex: correct ? 0 : 1,
      };
    }

    const options = q.options?.length ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];
    let correctIndex = 0;
    if (typeof q.correctAnswer === 'number') {
      correctIndex = q.correctAnswer;
    } else {
      const idx = options.findIndex(
        (o) => String(o).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
      );
      correctIndex = idx >= 0 ? idx : 0;
    }

    return {
      title: q.question,
      options,
      correctIndex,
    };
  }
}
