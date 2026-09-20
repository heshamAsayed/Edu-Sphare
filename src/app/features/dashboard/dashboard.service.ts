import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/config/api-config';
import { getHttpClient } from '../../core/http/http-client';
import { AddTeacherRequest, DashboardTeacher, RemoveTeacherResponse, School, Stage, Year } from './models';
import { Injectable } from '@angular/core';

const API_URL = `${API_CONFIG.BASE_URL}/Dashboard`;
@Injectable({
  providedIn: 'root'
})

export class DashboardService {
  private readonly http = getHttpClient();

  addTeacher(payload: AddTeacherRequest): Observable<DashboardTeacher> {
    return this.http.post<DashboardTeacher>(`${API_URL}/AddTeacher`, payload);
  }

  removeTeacher(id: string): Observable<RemoveTeacherResponse> {
    return this.http.delete<RemoveTeacherResponse>(`${API_URL}/RemoveTeacher/${id}`);
  }

  GetSchools(): Observable<School[]> {
    return this.http.get<School[]>(`${API_URL}/SchoolsWithStagesAndYears`);
  }

  GetStages(schoolId: string): Observable<Stage[]> {
    return this.http.get<Stage[]>(`${API_URL}/StagesWithYears/${schoolId}`);
  }

  GetYears(stageId: string): Observable<Year[]> {
    return this.http.get<Year[]>(`${API_URL}/YearsWithCourses/${stageId}`);
  }
}
