import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AssessmentQuestion, AssessmentResultData } from '../models/assessment.model';

@Injectable({
  providedIn: 'root',
})
export class AssessmentService {
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

  getQuestions(courseId?: string): Observable<AssessmentQuestion[]> {
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
}
