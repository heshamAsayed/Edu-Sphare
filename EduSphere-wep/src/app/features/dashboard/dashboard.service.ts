import { map, Observable } from 'rxjs';

import { API_CONFIG, toMediaUrl } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import {
  AddSchoolPayload,
  AddStagePayload,
  AddTeacherRequest,
  AddYearPayload,
  DashboardTeacher,
  FinancialReport,
  FinancialReportFilter,
  RemoveTeacherResponse,
  School,
  Stage,
  Year,
  TeacherCourse,
  TeacherProfile,
} from './models';
import { Injectable } from '@angular/core';

const API_URL       = `${API_CONFIG.BASE_URL}/Dashboard`;
const REPORT_URL    = `${API_CONFIG.BASE_URL}/FinancialReport`;
const COURSES_URL   = `${API_CONFIG.BASE_URL}/Courses`;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = getHttpClient();

  // ── Teachers ──────────────────────────────────────────────────────────────

  addTeacher(payload: AddTeacherRequest): Observable<DashboardTeacher> {
    return this.http.post<DashboardTeacher>(`${API_URL}/AddTeacher`, payload, {
      withCredentials: true,
    });
  }

  removeTeacher(id: string): Observable<RemoveTeacherResponse> {
    return this.http.delete<RemoveTeacherResponse>(`${API_URL}/RemoveTeacher/${id}`, {
      withCredentials: true,
    });
  }

  getAllTeachers(): Observable<DashboardTeacher[]> {
    return this.http.get<DashboardTeacher[]>(`${API_URL}/GetAllTeachers`, {
      withCredentials: true,
    }).pipe(
      map(teachers => (teachers || []).map(t => ({
        ...t,
        coursesCount: t.coursesCount ?? t.courses?.length ?? 0,
        studentsCount: t.studentsCount ??
          (t.courses?.reduce((s, c) => s + (c.studentsCount ?? 0), 0) ?? 0),
      })))
    );
  }

  getCurrentTeacher(): Observable<TeacherProfile> {
    return this.http.get<TeacherProfile>(`${API_URL}/Teacher`, { withCredentials: true });
  }

  getCurrentTeacherCourses(): Observable<TeacherCourse[]> {
    return this.http.get<TeacherCourse[]>(`${API_URL}/Teacher/Courses`, { withCredentials: true });
  }

  // ── Schools / Stages / Years (read) ──────────────────────────────────────

  GetSchools(): Observable<School[]> {
    return this.http.get<School[]>(`${API_URL}/SchoolsWithStagesAndYears`).pipe(
      map(schools => schools.map(school => ({
        ...school,
        imageUrl: toMediaUrl(school.imageUrl || school.imagePath),
      })))
    );
  }

  GetStages(schoolId: string): Observable<Stage[]> {
    return this.http.get<Stage[]>(`${API_URL}/StagesWithYears/${schoolId}`);
  }

  GetYears(stageId: string): Observable<Year[]> {
    return this.http.get<Year[]>(`${API_URL}/YearsWithCourses/${stageId}`);
  }

  // ── Schools / Stages / Years (write) ─────────────────────────────────────

  addSchool(payload: AddSchoolPayload, imageFile?: File): Observable<School> {
    const form = new FormData();
    form.append('name', payload.name);
    if (imageFile) form.append('image', imageFile);

    return this.http.post<School>(`${API_URL}/AddSchool`, form, {
      withCredentials: true,
    });
  }

  addStage(payload: AddStagePayload): Observable<Stage> {
    return this.http.post<Stage>(`${API_URL}/AddStage`, payload, {
      withCredentials: true,
    });
  }

  addYear(payload: AddYearPayload): Observable<Year> {
    return this.http.post<Year>(`${API_URL}/AddYear`, payload, {
      withCredentials: true,
    });
  }

  // ── All Courses (used by financial-report filter) ─────────────────────────

  getAllCourses(): Observable<{ id: string; name?: string; title?: string; teacherId?: string; teacherName?: string; price?: number; videosCount?: number }[]> {
    return this.http.get<any[]>(`${COURSES_URL}`, {
      withCredentials: true,
    }).pipe(
      map(courses => (courses || []).map(c => ({
        id: c.id,
        name: c.name || c.title || 'Untitled',
        title: c.title || c.name || 'Untitled',
        teacherId: c.teacherId ?? c.teacher?.id ?? undefined,
        teacherName: c.teacherName,
        price: c.price ?? 0,
        videosCount: c.videosCount ?? 0,
      })))
    );
  }

  // ── Financial Report ──────────────────────────────────────────────────────

  getFinancialReport(filter: FinancialReportFilter = {}): Observable<FinancialReport> {
    const params: Record<string, string> = {};
    if (filter.teacherId) params['teacherId'] = filter.teacherId;
    if (filter.courseId)  params['courseId']  = filter.courseId;
    if (filter.fromDate)  params['fromDate']  = filter.fromDate;

    return this.http.get<FinancialReport>(REPORT_URL, {
      params,
      withCredentials: true,
    });
  }

  downloadReportPdf(filter: FinancialReportFilter = {}): Observable<Blob> {
    const params: Record<string, string> = {};
    if (filter.teacherId) params['teacherId'] = filter.teacherId;
    if (filter.courseId)  params['courseId']  = filter.courseId;
    if (filter.fromDate)  params['fromDate']  = filter.fromDate;

    return this.http.get(`${REPORT_URL}/pdf`, {
      params,
      responseType: 'blob',
      withCredentials: true,
    });
  }

  downloadCurrentTeacherReport(): Observable<Blob> {
    return this.http.get(`${REPORT_URL}/pdf`, {
      responseType: 'blob',
      withCredentials: true,
    });
  }
}
