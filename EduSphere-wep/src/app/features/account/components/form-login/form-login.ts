import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { AccountService } from '../../index';
import { NonNullableFormBuilder } from '@angular/forms';

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

  modelError: string | null = null;
  isLoading = false;

  loginForm = this.fb.group({
    email: [''],
    password: ['']
  });

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    const data = this.loginForm.getRawValue();
    this.isLoading = true;
    this.modelError = null;

    this.authService.login(data).subscribe({
      next: () => {
        this.authService.checkAuth().subscribe({
          next: (user) => {
            this.isLoading = false;
            if (user?.role?.toLowerCase() === 'teacher' || user?.isStudent === false) {
              this.router.navigate(['/manage-courses']);
            } else {
              this.router.navigate(['/profile/me']);
            }
          },
          error: () => {
            this.isLoading = false;
            this.router.navigate(['/manage-courses']);
          }
        });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login failed:', error);

        if (error.status === 400 || error.status === 401) {
          this.modelError = 'Invalid email or password';
        } else if (error.status === 500) {
          this.modelError = 'Server error. Please try again later.';
        } else {
          this.modelError = 'Failed to sign in. Please check your internet connection.';
        }
      }
    });
  }
}

