import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccountService } from '../../index';

// ── Admin credentials (resolved entirely in the front-end — never sent to the backend) ──
const ADMIN_EMAIL    = 'admin@admin.com';
const ADMIN_PASSWORD = 'EduSphare123!';

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  standalone: true,
  selector: 'app-form-login',
  styleUrl: './form-login.css',
  templateUrl: './form-login.html',
})
export class FormLogin {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AccountService);
  private router = inject(Router);

  modelError = signal<string | null>(null);
  isLoading  = signal(false);

  loginForm = this.fb.group({
    email: [''],
    password: [''],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    const data = this.loginForm.getRawValue();
    this.isLoading.set(true);
    this.modelError.set(null);

    // ── Admin shortcut: check credentials locally, never call the backend ───
    const emailLower = data.email.trim().toLowerCase();

    if (emailLower === ADMIN_EMAIL) {
      if (data.password === ADMIN_PASSWORD) {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
        return;
      }
      this.isLoading.set(false);
      this.modelError.set('Invalid email or password.');
      return;
    }

    // ── Regular user login (hits backend) ───
    this.authService.login(data).subscribe({
      next: () => {
        this.authService.checkAuth().subscribe({
          next: (user) => {
            this.isLoading.set(false);
            if (user?.role?.toLowerCase() === 'teacher' || user?.isStudent === false) {
              this.router.navigate(['/teacher-dashboard']);
            } else {
              this.router.navigate(['/profile/me']);
            }
          },
          error: () => {
            this.isLoading.set(false);
            this.router.navigate(['/teacher-dashboard']);
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.modelError.set(this.resolveLoginError(error));
      },
    });
  }

  private resolveLoginError(error: HttpErrorResponse): string {
    const body = error.error;
    let apiMessage: string | null = null;

    if (typeof body === 'string' && body.trim()) {
      try {
        const parsed = JSON.parse(body);
        apiMessage = parsed?.message || parsed?.Message || body.trim();
      } catch {
        apiMessage = body.trim();
      }
    } else if (body && typeof body === 'object') {
      apiMessage = body.message || body.Message || body.title || null;
    }

    if (apiMessage) {
      return String(apiMessage);
    }

    if (error.status === 400 || error.status === 401) {
      return 'Invalid email or password.';
    }
    if (error.status === 0) {
      return 'Failed to sign in. Please check your internet connection.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return 'Failed to sign in. Please try again.';
  }
}
