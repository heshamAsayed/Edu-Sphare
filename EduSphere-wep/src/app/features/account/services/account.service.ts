import { Observable, tap, catchError, of, map, from } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';

import { API_CONFIG } from '../../../core/config/api-config';
import { getHttpClient } from '../../../core/http/http-client';
import {
  AccountSummary,
  AuthResponseDto,
  LoginRequest,
  LogoutResponse,
  RegisterRequest,
} from './../models';

const API_URL = `${API_CONFIG.BASE_URL}/Account`;

export interface OtpApiResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly http = getHttpClient();

  currentUser = signal<AccountSummary | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    this.checkAuth().subscribe();
  }

  checkAuth(): Observable<AccountSummary | null> {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('logged_out') === 'true') {
      this.currentUser.set(null);
      return of(null);
    }

    return this.getMe().pipe(
      catchError((err) => {
        // If 404, the user is authenticated but not a student (Teacher account)
        if (err.status === 404) {
          const teacherUser: AccountSummary = {
            id: '',
            name: 'Teacher',
            email: 'teacher@alphagen.com',
            role: 'Teacher',
            roles: ['Teacher'],
            isStudent: false,
          };
          this.currentUser.set(teacherUser);
          return of(teacherUser);
        }
        this.currentUser.set(null);
        return of(null);
      })
    );
  }

  register(payload: RegisterRequest): Observable<AccountSummary> {
    return this.http.post<AccountSummary>(`${API_URL}/register`, payload, {
      withCredentials: true,
    });
  }

  login(payload: LoginRequest): Observable<HttpResponse<AuthResponseDto>> {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('logged_out');
    }

    return this.http.post<AuthResponseDto>(`${API_URL}/login`, payload, {
      observe: 'response',
      withCredentials: true,
    }).pipe(
      tap(() => {
        this.checkAuth().subscribe();
      })
    );
  }

  logout(): Observable<LogoutResponse> {
    this.currentUser.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('logged_out', 'true');
    }

    // Use native fetch to call logout endpoint with credentials (cookies)
    return from(
      fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
        .then((res) => {
          this.currentUser.set(null);
          return res.json().catch(() => ({ message: 'Logged out.' }));
        })
        .catch(() => {
          this.currentUser.set(null);
          return { message: 'Logged out.' };
        })
    );
  }

  getAllStudents(): Observable<AccountSummary[]> {
    return this.http.get<AccountSummary[]>(`${API_URL}/students`, { withCredentials: true });
  }

  getMe(): Observable<AccountSummary> {
    return this.http.get<AccountSummary>(`${API_URL}/me`, {
      withCredentials: true,
    }).pipe(
      map((user: any) => {
        if (!user) return user;

        const rawPaid = user.paidCourses || user.PaidCourses || user.courses || [];
        const normalized = rawPaid.map((c: any) => {
          const actualCourseId = String(c.courseId || c.id || '');
          return {
            ...c,
            id: actualCourseId,
            courseId: actualCourseId,
            title: c.courseName || c.title || c.name || 'Enrolled Course',
            name: c.courseName || c.title || c.name || 'Enrolled Course',
            price: c.price ?? c.totalAmount ?? 0,
            isPaid: true,
          };
        });

        user.paidCourses = rawPaid;
        user.courses = normalized;

        if (user.isStudent === undefined) {
          user.isStudent = Boolean(user.schoolId || rawPaid.length > 0 || user.stageId || user.yearId);
        }

        return user as AccountSummary;
      }),
      tap((user) => {
        this.currentUser.set(user);
      })
    );
  }



  sendOTP(phone: string): Observable<OtpApiResponse> {
    return this.http.post<OtpApiResponse>(`${API_URL}/send-otp`, null, {
      params: { Phone: phone },
    });
  }


  verify(phone: string, code: string): Observable<OtpApiResponse> {
    return this.http.post<OtpApiResponse>(
      `${API_URL}/verify-otp`,
      {
        Phone: phone,
        Code: code,
      }
    );
  }
}
