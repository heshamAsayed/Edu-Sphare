import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, Stage, Year } from '../../../../dashboard/index';
import { School } from '../../../../dashboard/index';
import { RegistrationStateService } from '../../../services/registration-state-service';
import { AccountService } from '../../..';
import { Router } from '@angular/router';
import { LoadingSpinner } from '../../../../../shared/components/loading-spinner/loading-spinner';

// type School = {
//   id: string;
//   name: string;
//   description: string;
//   initials: string;
//   color: string;
// };

// type Stage = {
//   id: string;
//   name: string;
//   icon: 'cap' | 'book' | 'building';
// };

// type Year = {
//   id: string;
//   label: string;
// };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinner],
  selector: 'app-complete-profile',
  styleUrl: './complete-profile.css',
  templateUrl: './complete-profile.html',
})
export class CompleteProfile implements OnDestroy {

  reviewMode = false;
  private dashboardService = inject(DashboardService);
  private registerService = inject(RegistrationStateService);
  private accountService = inject(AccountService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  // =========================================================
  // SCHOOLS
  // =========================================================

  schools: School[] = [];
  Stage: Stage[] = [];
  Year: Year[] = [];

  ngOnInit(): void {
    this.loadSchools();
  }

  ngOnDestroy(): void {
    this.clearResendTimer();
    this.clearVerificationRedirectTimer();
  }

  private loadSchools(): void {
    this.dashboardService.GetSchools().subscribe({
      next: (schools) => {
        this.schools = schools;
      },
      error: (error) => {
        console.error('Error fetching schools:', error);
        alert('Error fetching schools. Please refresh the page and try again.');
      }
    });
  }

  // =========================================================
  // PHONE STATE
  // =========================================================

  countryCode = '+20';

  phoneNumber = '';

  otpCode = '';

  phoneError = '';

  otpSent = false;

  phoneVerified = false;
  verificationSuccess = false;

  registrationSaved = false;

  isRegistering = false;

  isSendingCode = false;

  isVerifyingCode = false;

  registrationError = '';
  resendSecondsRemaining = 0;
  private resendTimerId: ReturnType<typeof setInterval> | null = null;
  private verificationRedirectTimerId: ReturnType<typeof setTimeout> | null = null;


  // =========================================================
  // SELECTED DATA
  // =========================================================

  selectedSchool: School | null = null;

  selectedStage: Stage | null = null;

  selectedYear: Year | null = null;

  reviewName = '';
  reviewEmail = '';
  reviewPassword = '';
  showPassword = false;

  // =========================================================
  // GETTERS
  // =========================================================

  /**
   * Years available for the selected stage
   */
  // get availableYears(): Year[] {

  //   if (!this.selectedStage) {
  //     return [];
  //   }

  //   return this.yearsByStage[this.selectedStage.id] ?? [];
  // }


  /**
   * Mask phone number
   * Example:
   * +20 10 XXX 67
   */
  get maskedPhone(): string {

    const clean =
      this.phoneNumber.replace(/\D/g, '');

    if (clean.length <= 4) {
      return `${this.countryCode} ${clean}`;
    }

    const visibleStart =
      clean.slice(0, 2);

    const visibleEnd =
      clean.slice(-2);

    return `${this.countryCode} ${visibleStart} XXX ${visibleEnd}`;
  }

  get reviewSchoolName(): string {
    return this.selectedSchool?.name ?? 'Not selected';
  }

  get reviewStageName(): string {
    return this.selectedStage?.name ?? 'Not selected';
  }

  get reviewYearName(): string {
    return this.selectedYear?.name ?? 'Not selected';
  }

  /**
   * All onboarding steps completed
   */
  get isComplete(): boolean {

    return !!(
      this.phoneNumber.replace(/\D/g, '').length >= 7 &&
      this.selectedSchool &&
      this.selectedStage &&
      this.selectedYear
    );
  }


  /**
   * Show school section after phone verification
   */
  get showSchoolSection(): boolean {

    return this.phoneNumber.replace(/\D/g, '').length >= 7;
  }


  /**
   * Show stage section after selecting school
   */
  get showStageSection(): boolean {

    return !!this.selectedSchool;
  }


  /**
   * Show year section after selecting stage
   */
  get showYearSection(): boolean {

    return !!this.selectedStage;
  }


  // =========================================================
  // PHONE
  // =========================================================

  sendCode(): void {

    if (this.isSendingCode || this.isVerifyingCode || this.resendSecondsRemaining > 0) {
      return;
    }

    const cleanDigits =
      this.phoneNumber.replace(/\D/g, '');

    if (cleanDigits.length < 7) {

      this.phoneError =
        'Enter a valid phone number.';

      return;
    }

    // Store cleaned phone number
    this.phoneNumber = cleanDigits;

    this.phoneError = '';
    this.isSendingCode = true;
    this.startResendCountdown();

    this.accountService.sendOTP(`${this.countryCode}${cleanDigits}`).subscribe({
      next: (response) => {
        this.isSendingCode = false;
        this.otpSent = true;
        alert(response.message);
      },
      error: (error) => {
        console.error('Sending OTP failed:', error);
        this.isSendingCode = false;
        this.phoneError = error.error?.message || error.message || 'Could not send the verification code.';
        this.cdr.detectChanges();
      },
    });
  }


  resendCode(): void {

    if (this.resendSecondsRemaining > 0) {
      return;
    }

    this.otpCode = '';

    this.phoneError = '';

    this.sendCode();
  }


  verifyCode(): void {

    if (this.isVerifyingCode) {
      return;
    }

    const code =
      this.otpCode.trim();

    if (code.length < 4) {

      this.phoneError =
        'Enter the 4-digit code we sent you.';

      return;
    }

    this.phoneError = '';
    this.isVerifyingCode = true;

    this.accountService.verify(
      `${this.countryCode}${this.phoneNumber}`,
      code
    ).subscribe({
      next: () => {
        this.phoneVerified = true;
        this.verificationSuccess = this.registrationSaved;
        this.otpSent = false;
        this.isVerifyingCode = false;
        this.clearResendTimer();
        this.loginAfterVerification();
      },
      error: (error) => {
        console.error('Phone verification failed:', error);
        this.isVerifyingCode = false;
        this.phoneVerified = false;
        this.phoneError = error.error?.message || error.message || 'Could not verify the phone number.';
        this.cdr.detectChanges();
      },
    });
  }

  private startResendCountdown(): void {
    this.clearResendTimer();
    this.resendSecondsRemaining = 60;
    this.resendTimerId = setInterval(() => {
      this.resendSecondsRemaining -= 1;
      if (this.resendSecondsRemaining <= 0) {
        this.clearResendTimer();
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimerId !== null) {
      clearInterval(this.resendTimerId);
      this.resendTimerId = null;
    }
    this.resendSecondsRemaining = 0;
  }


  // =========================================================
  // SCHOOL
  // =========================================================

  chooseSchool(school: School): void {

    this.selectedSchool = school;

    // Changing school resets dependent selections
    this.selectedStage = null;

    this.selectedYear = null;
  }


  // =========================================================
  // STAGE
  // =========================================================

  chooseStage(stage: Stage): void {

    this.selectedStage = stage;

    // Changing stage resets year
    this.selectedYear = null;
  }


  // =========================================================
  // YEAR
  // =========================================================

  chooseYear(year: Year): void {

    this.selectedYear = year;
  }


  // =========================================================
  // EDIT PHONE
  // =========================================================

  reopenPhone(): void {

    if (this.registrationSaved) {
      return;
    }

    this.phoneVerified = false;
    this.verificationSuccess = false;

    this.otpSent = false;

    this.otpCode = '';

    this.phoneError = '';

    // Reset dependent selections
    this.selectedSchool = null;

    this.selectedStage = null;

    this.selectedYear = null;
  }


  // =========================================================
  // EDIT SCHOOL
  // =========================================================

  reopenSchool(): void {

    this.selectedSchool = null;

    this.selectedStage = null;

    this.selectedYear = null;
  }


  // =========================================================
  // EDIT STAGE
  // =========================================================

  reopenStage(): void {

    this.selectedStage = null;

    this.selectedYear = null;
  }


  // =========================================================
  // EDIT YEAR
  // =========================================================

  reopenYear(): void {

    this.selectedYear = null;
  }


  // =========================================================
  // NEXT
  // =========================================================

  next(): void {

    if (!this.isComplete) {
      return;
    }

    this.goToReview();
  }





  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  goToReview(): void {
    if (!this.isComplete) return;
    this.reviewMode = true;
    if (!this.selectedSchool || !this.selectedStage || !this.selectedYear) {
      console.error('Selected school, stage, or year is null');
      return;
    }

    const currentData = this.registerService.getData();
    this.reviewName = currentData.name ?? '';
    this.reviewEmail = currentData.email ?? '';
    this.reviewPassword = currentData.password ?? '';

    this.registerService.setEducationData(
      `${this.countryCode}${this.phoneNumber}`,
      this.selectedSchool?.id ? this.selectedSchool.id : null,
      this.selectedStage?.id ? this.selectedStage.id : null,
      this.selectedYear?.id ? this.selectedYear.id : null
    );
  }

  editStep(step: 'phone' | 'school' | 'stage' | 'year'): void {
    this.reviewMode = false;

    if (this.registrationSaved) {
      return;
    }

    if (step === 'phone') {
      this.phoneVerified = false;
      this.otpSent = false;
      this.otpCode = '';
      this.phoneError = '';
    }

    if (step === 'school') this.selectedSchool = null;
    if (step === 'stage') this.selectedStage = null;
    if (step === 'year') this.selectedYear = null;
  }

  editAccountDetails(): void {
    this.router.navigate(['/auth/register']);
  }



Registration(): void {

  if (!this.isComplete || this.isRegistering) {
    return;
  }

  this.isRegistering = true;
  this.registrationError = '';

  const Data = this.registerService.getData();
  Data.name = this.reviewName.trim();
  Data.email = this.reviewEmail.trim();
  Data.password = this.reviewPassword;
  Data.confirmPassword = this.reviewPassword;

  this.accountService.register(Data).subscribe({

    next: () => {

      this.registrationSaved = true;
      this.reviewMode = false;
      this.isRegistering = false;
      this.cdr.detectChanges();

      // The review DOM has been removed and the verification DOM is rendered before the async OTP request begins.
      setTimeout(() => {
        if (this.registrationSaved && !this.phoneVerified) {
          this.sendCode();
        }
      });

    },

    error: (error) => {

      console.error('Registration failed:', error);

      this.isRegistering = false;
      this.registrationError = this.getRegistrationError(error);
      this.cdr.detectChanges();

    }

  });
}

private getRegistrationError(error: any): string {
  if (error.error?.message) {
    return error.error.message;
  }

  if (error.error?.errors) {
    return Object.values(error.error.errors).flat().join(' ');
  }

  if (error.status === 409) {
    return 'An account with these details already exists. Please update your email or password and try again.';
  }

  return error.error?.title || 'Registration failed. Please try again.';
}

private loginAfterVerification(): void {
  const data = this.registerService.getData();

  this.accountService.login({
    email: data.email,
    password: data.password,
  }).subscribe({
    next: () => {
      this.verificationRedirectTimerId = setTimeout(() => {
        this.router.navigate(['/profile/me'], { queryParams: { tab: 'paid' } });
        this.verificationRedirectTimerId = null;
      }, 5000);
    },
    error: (error) => {
      console.error('Login failed:', error);
      alert(`Login failed: ${error.message}`);
    },
  });
}

private clearVerificationRedirectTimer(): void {
  if (this.verificationRedirectTimerId !== null) {
    clearTimeout(this.verificationRedirectTimerId);
    this.verificationRedirectTimerId = null;
  }
}

}
