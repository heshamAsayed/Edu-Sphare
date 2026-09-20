import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import { VideoBatchUploadResponse, VideoItem, VideoUploadResponse } from './models';

const API_URL = `${API_CONFIG.BASE_URL}/api/Videos`;

export class VideosService {
  private readonly http = getHttpClient();

  uploadVideo(formData: FormData): Observable<VideoUploadResponse> {
    return this.http.post<VideoUploadResponse>(`${API_URL}/upload`, formData);
  }

  uploadBatch(formData: FormData): Observable<VideoBatchUploadResponse> {
    return this.http.post<VideoBatchUploadResponse>(`${API_URL}/upload-batch`, formData);
  }

  getCourseVideos(courseId: string): Observable<VideoItem[]> {
    return this.http.get<VideoItem[]>(`${API_URL}/course/${courseId}`);
  }

  getVideoById(videoId: string): Observable<VideoItem> {
    return this.http.get<VideoItem>(`${API_URL}/${videoId}`);
  }

  deleteVideo(videoId: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${videoId}`);
  }
}
