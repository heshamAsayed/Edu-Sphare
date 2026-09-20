export type AttentionQuestionType = 'MCQ' | 'TrueFalse' | string;

export interface AttentionQuestion {
  type: string;
  question: string;
  options?: string[];
  correctAnswer: any;
}

export interface AttentionPenaltyRequest {
  videoId: string;
  secondsTaken: number;
}

export interface AttentionPenaltyResponse {
  isSuccess: boolean;
  message: string;
}
