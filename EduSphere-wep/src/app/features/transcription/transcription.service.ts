import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import { ProcessVideoResponse, TranscriptionResult } from './models';

const API_URL = `${API_CONFIG.BASE_URL}/Transcription`;

@Injectable({ providedIn: 'root' })
export class TranscriptionService {
  private readonly http = getHttpClient();

  getVideoTranscription(videoId: string): Observable<TranscriptionResult> {
    return this.http.get<TranscriptionResult>(`${API_URL}/video/${encodeURIComponent(videoId)}`, {
      withCredentials: true,
    });
  }

  processVideo(videoId: string): Observable<ProcessVideoResponse> {
    return this.http.post<ProcessVideoResponse>(
      `${API_URL}/process-video/${encodeURIComponent(videoId)}`,
      {},
      { withCredentials: true }
    );
  }
}
