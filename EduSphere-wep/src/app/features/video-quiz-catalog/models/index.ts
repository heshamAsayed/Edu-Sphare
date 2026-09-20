export interface VideoQuizCatalogQuestion {
  type: string;
  question: string;
  options?: string[];
  correctAnswer: number | boolean;
}

export interface VideoQuizCatalogItem {
  success: boolean;
  videoId: string;
  title: string;
  sortOrder: number;
  hasQuestions: boolean;
  questions: VideoQuizCatalogQuestion[];
}

export interface CourseQuizCatalogResponse {
  success: boolean;
  data: unknown;
}
