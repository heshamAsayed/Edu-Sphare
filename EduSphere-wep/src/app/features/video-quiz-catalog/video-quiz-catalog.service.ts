import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import { CourseQuizCatalogResponse, VideoQuizCatalogItem } from './models';

const API_URL = `${API_CONFIG.BASE_URL}/VideoQuizCatalog`;

@Injectable({ providedIn: 'root' })
export class VideoQuizCatalogService {
  private readonly http = getHttpClient();

  getVideoQuizCatalog(videoId: string): Observable<VideoQuizCatalogItem> {
    return this.http.get<VideoQuizCatalogItem>(`${API_URL}/video/${encodeURIComponent(videoId)}`, {
      withCredentials: true,
    });
  }

  getCourseQuizCatalog(courseId: string): Observable<CourseQuizCatalogResponse> {
    return this.http.get<CourseQuizCatalogResponse>(`${API_URL}/course/${encodeURIComponent(courseId)}`, {
      withCredentials: true,
    });
  }
}
