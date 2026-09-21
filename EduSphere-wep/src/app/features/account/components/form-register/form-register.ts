import { Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RegistrationStateService } from '../../services/registration-state-service';

@Component({
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-form-register',
  styleUrl: './form-register.css',
  templateUrl: './form-register.html',
})
export class FormRegister {
  private FM = inject(NonNullableFormBuilder);
  private registerService = inject(RegistrationStateService);
  private router = inject(Router);
  Agreement: boolean = false;
  isLoading = false;
  
  registerForm = this.FM.group({
    Name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9])/)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    const data = this.registerService.getData();
    this.registerForm.patchValue({
      Name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  }


  IAgree(): void { this.Agreement = !this.Agreement; 
  }


  OnSubmit() {
    if (this.isLoading) {
      return;
    }

    if (this.registerForm.invalid || !this.Agreement) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const data = this.registerForm.getRawValue();
    this.registerService.setAccountData(
      data.Name,
      data.email,
      data.password,
    );
    // Navigate to the next step in the registration process (Complete Profile)
    this.router.navigate(['auth/register/completeprofile']).finally(() => {
      this.isLoading = false;
    });
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}
