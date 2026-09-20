import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api-config';
import { Course } from '../models';

const API_URL = `${API_CONFIG.BASE_URL}/Learning`;

@Injectable({
   providedIn: 'root' 
  })

export class LessonService {


  constructor(private http: HttpClient) {}

  getLesson(courseId: string): Observable<any> {
    return this.http.get<any>(`${API_URL}/Lesson/${encodeURIComponent(courseId)}`);
  }

  markVideoWatched(courseId: string | undefined, videoId: string): Observable<any> {
    return this.http.post<any>(`${API_URL}/MarkVideoWatched`, { courseId, videoId });
  }

  getUploadProgress(uploadId: string): Observable<any> {
    const params = new HttpParams().set('uploadId', uploadId);
    return this.http.get<any>(`${API_URL}/GetUploadProgress`, { params });
  }

  getTranscriptionStatus(videoId: string): Observable<any> {
    const params = new HttpParams().set('videoId', videoId);
    return this.http.get<any>(`${API_URL}/GetTranscriptionStatus`, { params });
  }

  getBackgroundProgress(progressId: string): Observable<any> {
    const params = new HttpParams().set('progressId', progressId);
    return this.http.get<any>(`${API_URL}/GetBackgroundProgress`, { params });
  }

  reorderVideo(videoId: string, sortOrder: number): Observable<any> {
    const form = new FormData();
    form.append('videoId', videoId);
    form.append('sortOrder', String(sortOrder));
    return this.http.post<any>(`${API_URL}/ReorderVideo`, form);
  }

  uploadVideo(courseId: string, dto: any, uploadId?: string): Observable<any> {
    // dto expected to be FormData or object with file fields
    const params = uploadId ? { params: new HttpParams().set('uploadId', uploadId) } : {};
    // if dto is FormData, append courseId
    if (dto instanceof FormData) {
      dto.append('courseId', courseId);
      const req = new HttpRequest('POST', `${API_URL}/UploadVideo`, dto, { reportProgress: true });
      return this.http.request(req);
    }
    // otherwise send as form
    const form = new FormData();
    Object.keys(dto).forEach(k => {
      const v = (dto as any)[k];
      if (v instanceof FileList) {
        for (let i = 0; i < v.length; i++) form.append(k, v.item(i)!);
      } else if (v instanceof File) {
        form.append(k, v);
      } else if (v !== undefined && v !== null) {
        form.append(k, String(v));
      }
    });
    form.append('courseId', courseId);
    const req = new HttpRequest('POST', `${API_URL}/UploadVideo`, form, { reportProgress: true });
    return this.http.request(req);
  }

  // Helper to call teacher endpoints
  getTeacherCourses(): Observable<any> {
    return this.http.get<any>('/api/Dashboard/Teacher/Courses');
  }

  // Create course via API
  createCourse(dto: Course): Observable<any> {
    return this.http.post<any>('/api/Courses', dto);
  }
}
