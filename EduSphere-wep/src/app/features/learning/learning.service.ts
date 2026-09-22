import { Injectable } from '@angular/core';
import { HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import {
  CourseContentResponse,
  CreateCourseRequest,
  CreateCourseResponse,
  LessonResponse,
  ManageCoursesResponse,
  MarkVideoWatchedRequest,
  MarkVideoWatchedResponse,
  ProgressStatusResponse,
  ReorderVideoRequest,
  TeacherStagesResponse,
  UploadVideoResponse,
} from './models';

const LEARNING_API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEARNING.BASE}`;
const TRANSCRIPTION_API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRANSCRIPTION.BASE}`;

@Injectable({
  providedIn: 'root',
})
export class LearningService {
  private readonly http = getHttpClient();

  getLesson(courseId: string): Observable<LessonResponse> {
    return this.http.get<LessonResponse>(`${LEARNING_API_URL}/Lesson/${encodeURIComponent(courseId)}`, {
      withCredentials: true,
    });
  }

  markVideoWatched(payload: MarkVideoWatchedRequest): Observable<MarkVideoWatchedResponse> {
    return this.http.post<MarkVideoWatchedResponse>(`${LEARNING_API_URL}/MarkVideoWatched`, payload, {
      withCredentials: true,
    });
  }

  getManageCourses(): Observable<ManageCoursesResponse> {
    return this.http.get<ManageCoursesResponse>(`${LEARNING_API_URL}/ManageCourses`, {
      withCredentials: true,
    });
  }

  getCourseContent(courseId: string): Observable<CourseContentResponse> {
    return this.http.get<CourseContentResponse>(`${LEARNING_API_URL}/CourseContent/${encodeURIComponent(courseId)}`, {
      withCredentials: true,
    });
  }

  getTeacherStages(): Observable<TeacherStagesResponse> {
    return this.http.get<TeacherStagesResponse>(`${LEARNING_API_URL}/TeacherStages`, {
      withCredentials: true,
    });
  }

  createCourse(payload: CreateCourseRequest): Observable<CreateCourseResponse> {
    const formData = new FormData();
    formData.append('Name', payload.name.trim());
    formData.append('Price', String(payload.price ?? 0));
    formData.append('StageId', payload.stageId);
    formData.append('YearId', payload.yearId);
    formData.append('InstructorId', payload.instructorId || 'authenticated-teacher');

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(API_CONFIG.TOKEN_KEY) : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.http.post<CreateCourseResponse>(`${LEARNING_API_URL}/CreateCourse`, formData, {
      withCredentials: true,
      headers,
    });
  }

  getUploadProgress(uploadId: string): Observable<ProgressStatusResponse> {
    return this.http.get<ProgressStatusResponse>(`${LEARNING_API_URL}/GetUploadProgress`, {
      params: { uploadId },
      withCredentials: true,
    });
  }

  getTranscriptionStatus(videoId: string): Observable<{ success: boolean; status: string; errorMessage?: string }> {
    return this.http.get<{ success: boolean; status: string; errorMessage?: string }>(
      `${LEARNING_API_URL}/GetTranscriptionStatus`,
      {
        params: { videoId },
        withCredentials: true,
      }
    );
  }

  getTranscription(videoId: string): Observable<string> {
    return this.http.get(`${TRANSCRIPTION_API_URL}/${encodeURIComponent(videoId)}`, {
      responseType: 'text',
      withCredentials: true,
    });
  }

  getBackgroundProgress(progressId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${LEARNING_API_URL}/GetBackgroundProgress`, {
      params: { progressId },
      withCredentials: true,
    });
  }

  reorderVideo(payload: ReorderVideoRequest): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${LEARNING_API_URL}/ReorderVideo`, payload, {
      withCredentials: true,
    });
  }

  uploadVideo(formData: FormData, uploadId?: string): Observable<UploadVideoResponse> {
    const params = uploadId ? { uploadId } : undefined;
    return this.http.post<UploadVideoResponse>(`${LEARNING_API_URL}/UploadVideo`, formData, {
      params,
      withCredentials: true,
    });
  }

  uploadVideoWithProgress(courseId: string, formData: FormData, uploadId?: string): Observable<HttpEvent<UploadVideoResponse>> {
    let url = `${LEARNING_API_URL}/UploadVideo?courseId=${encodeURIComponent(courseId)}`;
    if (uploadId) {
      url += `&uploadId=${encodeURIComponent(uploadId)}`;
    }
    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true,
      withCredentials: true,
    });
    return this.http.request<UploadVideoResponse>(req);
  }
}

