export type QuizQuestionType = 'MCQ' | 'TrueFalse';

export interface QuizQuestion {
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer: number | boolean;
}

export interface QuizGenerateResponse {
  success: boolean;
  cached: boolean;
  questions: QuizQuestion[];
}

export interface QuizSubmitRequest {
  videoId: string;
  answers: Array<number | boolean>;
}

export interface QuizSubmitResultItem {
  index: number;
  isCorrect: boolean;
  correctAnswer: number | boolean | null;
  studentAnswer: number | boolean | null;
}

export interface QuizSubmitResponse {
  success: boolean;
  correct: number;
  total: number;
  scorePercent: number;
  results: QuizSubmitResultItem[];
}

export interface QuizScoreResponse {
  success: boolean;
  hasTaken: boolean;
  scorePercent?: number;
}

export interface QuizCatalogResult {
  success: boolean;
  videoId: string;
  title: string;
  sortOrder: number;
  hasQuestions: boolean;
  questions: QuizQuestion[];
}
