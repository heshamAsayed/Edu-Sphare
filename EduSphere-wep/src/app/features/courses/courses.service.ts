import { Observable, catchError, of, tap } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_CONFIG, toMediaUrl } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import { Course, CourseListItem } from './models';
import { VideoItem } from '../videos/models';
import { computed, Injectable, signal } from '@angular/core';

const API_URL = `${API_CONFIG.BASE_URL}/Courses`;

@Injectable({
  providedIn: 'root'
})

export class CoursesService {
  private readonly http = getHttpClient();

  readonly studentAvailableCourses = signal<CourseListItem[]>([]);
  readonly studentAvailableCourseIds = computed<Set<string>>(() =>
    new Set(this.studentAvailableCourses().map((c) => (c.id || '').trim().toLowerCase()))
  );
  readonly hasLoadedAvailable = signal<boolean>(false);

  getCourses(schoolId: string, stageId: string, yearId: string): Observable<CourseListItem[]> {
    return this.http.get<CourseListItem[]>(`${API_URL}/${encodeURIComponent(schoolId)}/${encodeURIComponent(stageId)}/${encodeURIComponent(yearId)}`, {
      withCredentials: true,
    }).pipe(
      map((courses) => courses.map((course) => ({
        ...course,
        imageUrl: toMediaUrl(course.imageUrl || course.imagePath),
      }))),
    );
  }

  loadStudentAvailableCourses(schoolId: string, stageId: string, yearId: string): Observable<CourseListItem[]> {
    if (!schoolId || !stageId || !yearId) {
      this.hasLoadedAvailable.set(true);
      return of([]);
    }

    return this.getCourses(schoolId, stageId, yearId).pipe(
      tap((courses) => {
        this.studentAvailableCourses.set(courses);
        this.hasLoadedAvailable.set(true);
      }),
      catchError((err) => {
        console.error('Failed to load student available courses:', err);
        this.hasLoadedAvailable.set(true);
        return of([]);
      })
    );
  }

  getCourseById(id: string): Observable<Course> {
    return this.http.get<Course>(`${API_URL}/${encodeURIComponent(id)}`, {
      withCredentials: true,
    }).pipe(
      map((course) => ({
        ...course,
        imageUrl: toMediaUrl(course.imageUrl || course.imagePath),
        title: course.title || (course as any).name || 'Course Details',
        videos: course.videos?.map((video) => {
          const rawVideo = video as VideoItem & Record<string, unknown>;

          return {
            ...video,
            title: video.title || (rawVideo['videoTitle'] as string) || (rawVideo['name'] as string) || 'Untitled video',
            description: video.description
              || (rawVideo['videoDescription'] as string)
              || (rawVideo['descripe'] as string),
            createdAt: video.createdAt || (rawVideo['uploadDate'] as string),
          };
        }),
      })),
      catchError(() => {
        // Fallback to Learning API if course is from the Learning/Lesson system
        return this.http.get<any>(`${API_CONFIG.BASE_URL}/Learning/Lesson/${encodeURIComponent(id)}`, {
          withCredentials: true,
        }).pipe(
          map((res) => {
            const c = res.course || {};
            const vids = res.videos || [];
            return {
              id: c.id || id,
              title: c.name || c.title || 'Course Details',
              description: c.description || '',
              price: c.price ?? 0,
              isPaid: true,
              teacherName: c.teacherName || '',
              videosCount: vids.length,
              videos: vids.map((v: any) => ({
                id: v.id,
                title: v.title || 'Lesson',
                description: v.description || '',
                sortOrder: v.sortOrder || 0,
                duration: v.duration || 0,
                isWatched: v.isWatched || false,
                bunnyVideoId: v.bunnyVideoId,
              })),
            } as Course;
          })
        );
      })
    );
  }
}
