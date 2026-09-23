import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
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

  /**
   * Always hits the API (POST + no-store). Never rely on browser/HTTP cache.
   */
  generateQuestion(): Observable<AttentionQuestion> {
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    // POST avoids intermediary GET caching; _ts busts any leftover caches
    return this.http.post<AttentionQuestion>(
      `${API_URL}/generate?_ts=${Date.now()}`,
      {},
      {
        headers,
        withCredentials: true,
      }
    );
  }

  recordPenalty(payload: AttentionPenaltyRequest): Observable<AttentionPenaltyResponse> {
    return this.http.post<AttentionPenaltyResponse>(`${API_URL}/record-penalty`, payload, {
      withCredentials: true,
    });
  }
}
