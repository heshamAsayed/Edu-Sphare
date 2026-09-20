export interface TranscriptionResult {
  success: boolean;
  videoId: string;
  transcriptionText?: string;
  status: string;
  createdAt?: string;
  errorMessage?: string;
}

export interface ProcessVideoResponse {
  success: boolean;
  message?: string;
}
