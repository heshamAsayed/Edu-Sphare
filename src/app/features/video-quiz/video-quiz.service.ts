import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import {
  QuizCatalogResult,
  QuizGenerateResponse,
  QuizScoreResponse,
  QuizSubmitRequest,
  QuizSubmitResponse,
} from './models';

const API_URL = `${API_CONFIG.BASE_URL}/api/VideoQuiz`;

export class VideoQuizService {
  private readonly http = getHttpClient();

  generateQuiz(videoId: string): Observable<QuizGenerateResponse> {
    return this.http.get<QuizGenerateResponse>(`${API_URL}/generate`, {
      params: { videoId },
    });
  }

  submitQuiz(payload: QuizSubmitRequest): Observable<QuizSubmitResponse> {
    return this.http.post<QuizSubmitResponse>(`${API_URL}/submit`, payload);
  }

  getScore(videoId: string): Observable<QuizScoreResponse> {
    return this.http.get<QuizScoreResponse>(`${API_URL}/score`, {
      params: { videoId },
    });
  }

  getCatalog(videoId: string): Observable<QuizCatalogResult> {
    return this.http.get<QuizCatalogResult>(`${API_URL}/catalog/${videoId}`);
  }
}
