import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import { AttentionPenaltyRequest, AttentionPenaltyResponse, AttentionQuestion } from './models';

const API_URL = `${API_CONFIG.BASE_URL}/AttentionQuestion`;

@Injectable({
  providedIn: 'root',
})
export class AttentionQuestionService {
  private readonly http = getHttpClient();

  generateQuestion(): Observable<AttentionQuestion> {
    return this.http.get<AttentionQuestion>(`${API_URL}/generate`, {
      withCredentials: true,
    });
  }

  recordPenalty(payload: AttentionPenaltyRequest): Observable<AttentionPenaltyResponse> {
    return this.http.post<AttentionPenaltyResponse>(`${API_URL}/record-penalty`, payload, {
      withCredentials: true,
    });
  }
}
