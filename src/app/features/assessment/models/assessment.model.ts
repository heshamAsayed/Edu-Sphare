export interface AssessmentQuestion {
  title: string;
  options: string[];
  correctIndex: number;
}

export interface AssessmentResultData {
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
}
