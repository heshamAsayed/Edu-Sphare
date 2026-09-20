import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
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
  
  registerForm = this.FM.group({
    Name: [''],
    email: [''],
    password: [''],
    confirmPassword: ['']
  });


  IAgree(): void { this.Agreement = !this.Agreement; 
    // console.log('Agreement:', this.Agreement);
  }


  OnSubmit() {
    if(this.registerForm.invalid) {
      return;
    }

    const data = this.registerForm.getRawValue();
    console.log('Form Data:', data);

    this.registerService.setAccountData(
      data.Name,
      data.email,
      data.password,
    );
    // Navigate to the next step in the registration process (Complete Profile)
    this.router.navigate(['auth/register/completeprofile']);
  }
}
