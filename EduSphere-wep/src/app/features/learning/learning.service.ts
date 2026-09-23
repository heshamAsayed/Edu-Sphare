import { Injectable } from '@angular/core';
import { HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_CONFIG, toMediaUrl } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import {
  CourseContentResponse,
  CourseSummary,
  CreateCourseRequest,
  CreateCourseResponse,
  LessonResponse,
  LessonVideo,
  ManageCourseItem,
  ManageCoursesResponse,
  MarkVideoWatchedRequest,
  MarkVideoWatchedResponse,
  ProgressStatusResponse,
  ReorderVideoRequest,
  TeacherStatisticsItem,
  TeacherStagesResponse,
  UploadVideoResponse,
  VideoAttachment,
} from './models';

const LEARNING_API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEARNING.BASE}`;
const TRANSCRIPTION_API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRANSCRIPTION.BASE}`;

@Injectable({
  providedIn: 'root',
})
export class LearningService {
  private readonly http = getHttpClient();

  /**
   * Course lesson payload for students/teachers.
   * For teachers this includes `teacherStatistics` (focus, attendance, quiz averages).
   */
  getLesson(courseId: string): Observable<LessonResponse> {
    return this.http
      .get<unknown>(`${LEARNING_API_URL}/Lesson/${encodeURIComponent(courseId)}`, {
        withCredentials: true,
      })
      .pipe(map(raw => this.normalizeLesson(raw)));
  }

  markVideoWatched(payload: MarkVideoWatchedRequest): Observable<MarkVideoWatchedResponse> {
    return this.http.post<MarkVideoWatchedResponse>(`${LEARNING_API_URL}/MarkVideoWatched`, payload, {
      withCredentials: true,
    });
  }

  getManageCourses(): Observable<ManageCoursesResponse> {
    return this.http
      .get<unknown>(`${LEARNING_API_URL}/ManageCourses`, {
        withCredentials: true,
      })
      .pipe(map(raw => this.normalizeManageCourses(raw)));
  }

  getCourseContent(courseId: string): Observable<CourseContentResponse> {
    return this.http
      .get<unknown>(`${LEARNING_API_URL}/CourseContent/${encodeURIComponent(courseId)}`, {
        withCredentials: true,
      })
      .pipe(map(raw => this.normalizeCourseContent(raw)));
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
    if (payload.image) {
      formData.append('image', payload.image, payload.image.name);
    }

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
    return this.http
      .get<{ transcriptionText?: string }>(`${TRANSCRIPTION_API_URL}/video/${encodeURIComponent(videoId)}`, {
        withCredentials: true,
      })
      .pipe(map((res) => res?.transcriptionText?.trim() || ''));
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

  // ── Response normalizers (camelCase + PascalCase + numeric coercion) ─────

  private normalizeLesson(raw: unknown): LessonResponse {
    const r = (raw ?? {}) as Record<string, any>;
    const course = this.normalizeCourse(r['course'] ?? r['Course'] ?? {});
    const videos = this.normalizeVideos(r['videos'] ?? r['Videos'] ?? []);
    const activeRaw = r['activeVideo'] ?? r['ActiveVideo'] ?? null;
    const statsRaw = r['teacherStatistics'] ?? r['TeacherStatistics'] ?? [];

    return {
      course,
      videos,
      activeVideo: activeRaw ? this.normalizeVideo(activeRaw) : videos[0] ?? null,
      studentId: r['studentId'] ?? r['StudentId'] ?? null,
      isTeacher: Boolean(r['isTeacher'] ?? r['IsTeacher'] ?? false),
      teacherStatistics: this.normalizeTeacherStatistics(statsRaw),
    };
  }

  private normalizeManageCourses(raw: unknown): ManageCoursesResponse {
    const r = (raw ?? {}) as Record<string, any>;
    const coursesRaw = r['courses'] ?? r['Courses'] ?? [];
    const courses: ManageCourseItem[] = (Array.isArray(coursesRaw) ? coursesRaw : []).map((c: any) => ({
      id: String(c?.id ?? c?.Id ?? ''),
      name: String(c?.name ?? c?.Name ?? c?.title ?? c?.Title ?? 'Untitled course'),
      price: this.toNumber(c?.price ?? c?.Price) ?? 0,
      videosCount: this.toNumber(c?.videosCount ?? c?.VideosCount) ?? 0,
      createdAt: c?.createdAt ?? c?.CreatedAt,
      stageName: c?.stageName ?? c?.StageName,
      yearName: c?.yearName ?? c?.YearName,
    })).filter((c: ManageCourseItem) => !!c.id);

    return {
      teacherSchoolName: r['teacherSchoolName'] ?? r['TeacherSchoolName'],
      stages: r['stages'] ?? r['Stages'] ?? [],
      courses,
    };
  }

  private normalizeCourseContent(raw: unknown): CourseContentResponse {
    const r = (raw ?? {}) as Record<string, any>;
    return {
      course: this.normalizeCourse(r['course'] ?? r['Course'] ?? {}),
      videos: this.normalizeVideos(r['videos'] ?? r['Videos'] ?? []),
    };
  }

  private normalizeCourse(raw: any): CourseSummary {
    return {
      id: String(raw?.id ?? raw?.Id ?? ''),
      name: raw?.name ?? raw?.Name,
      title: raw?.title ?? raw?.Title ?? raw?.name ?? raw?.Name,
      schoolName: raw?.schoolName ?? raw?.SchoolName,
      stageName: raw?.stageName ?? raw?.StageName,
      yearName: raw?.yearName ?? raw?.YearName,
      description: raw?.description ?? raw?.Description,
      price: this.toNumber(raw?.price ?? raw?.Price) ?? undefined,
      instructorId: raw?.instructorId ?? raw?.InstructorId ?? raw?.teacherId ?? raw?.TeacherId,
      createdAt: raw?.createdAt ?? raw?.CreatedAt,
    };
  }

  private normalizeVideos(raw: unknown): LessonVideo[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(v => this.normalizeVideo(v));
  }

  private normalizeVideo(raw: any): LessonVideo {
    return {
      id: String(raw?.id ?? raw?.Id ?? ''),
      title: String(raw?.title ?? raw?.Title ?? 'Untitled video'),
      description: raw?.description ?? raw?.Description,
      sortOrder: this.toNumber(raw?.sortOrder ?? raw?.SortOrder) ?? 0,
      availabilityDays: this.toNumber(raw?.availabilityDays ?? raw?.AvailabilityDays) ?? undefined,
      isWatched: Boolean(raw?.isWatched ?? raw?.IsWatched ?? false),
      bunnyVideoId: raw?.bunnyVideoId ?? raw?.BunnyVideoId,
      duration: this.toNumber(raw?.duration ?? raw?.Duration) ?? undefined,
      attachments: this.normalizeAttachments(raw?.attachments ?? raw?.Attachments ?? []),
    };
  }

  private normalizeAttachments(raw: unknown): VideoAttachment[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((a: any) => {
        const path = a?.url ?? a?.Url ?? a?.path ?? a?.Path ?? '';
        return {
          name: a?.name ?? a?.Name ?? a?.originalFileName ?? a?.OriginalFileName,
          originalFileName: a?.originalFileName ?? a?.OriginalFileName ?? a?.name ?? a?.Name,
          url: toMediaUrl(path),
        };
      })
      .filter((a: VideoAttachment) => !!a.url);
  }

  private normalizeTeacherStatistics(raw: unknown): TeacherStatisticsItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((s: any) => ({
      videoId: String(s?.videoId ?? s?.VideoId ?? ''),
      enrolledStudentsCount: this.toNumber(s?.enrolledStudentsCount ?? s?.EnrolledStudentsCount) ?? 0,
      watchedStudentsCount: this.toNumber(s?.watchedStudentsCount ?? s?.WatchedStudentsCount) ?? 0,
      // Backend returns null when there is nothing to score yet → treat as 0 for UI
      averagePostVideoQuizScore: this.toNumber(s?.averagePostVideoQuizScore ?? s?.AveragePostVideoQuizScore) ?? 0,
      averageFocusPercent: this.toNumber(s?.averageFocusPercent ?? s?.AverageFocusPercent) ?? 0,
      absentStudentsCount: this.toNumber(s?.absentStudentsCount ?? s?.AbsentStudentsCount) ?? 0,
    }));
  }

  private toNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }
}
