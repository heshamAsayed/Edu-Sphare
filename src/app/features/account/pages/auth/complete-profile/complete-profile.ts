import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, Stage, Year } from '../../../../dashboard/index';
import { School } from '../../../../dashboard/index';
import { RegistrationStateService } from '../../../services/registration-state-service';
import { AccountService } from '../../..';
import { Router } from '@angular/router';

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
  imports: [CommonModule, FormsModule],
  selector: 'app-complete-profile',
  styleUrl: './complete-profile.css',
  templateUrl: './complete-profile.html',
})
export class CompleteProfile {

  reviewMode = false;
  private dashboardService = inject(DashboardService);
  private registerService = inject(RegistrationStateService);
  private accountService = inject(AccountService);
  private router = inject(Router);
  // =========================================================
  // SCHOOLS
  // =========================================================

  schools: School[] = [];
  Stage: Stage[] = [];
  Year: Year[] = [];

  ngOnInit(): void {
    this.loadSchools();
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
      this.phoneVerified &&
      this.selectedSchool &&
      this.selectedStage &&
      this.selectedYear
    );
  }


  /**
   * Show school section after phone verification
   */
  get showSchoolSection(): boolean {

    return this.phoneVerified;
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

    // Simulation
    this.otpSent = true;
  }


  resendCode(): void {

    this.otpCode = '';

    this.phoneError = '';

    // Simulation:
    // In the real backend this method
    // should call the Send OTP API.

    this.otpSent = true;
  }


  verifyCode(): void {

    const code =
      this.otpCode.trim();

    if (code.length < 4) {

      this.phoneError =
        'Enter the 4-digit code we sent you.';

      return;
    }

    this.phoneError = '';

    // Simulation
    this.phoneVerified = true;

    this.otpSent = false;
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

    this.phoneVerified = false;

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

    const profileData = {

      phone: {
        countryCode: this.countryCode,
        phoneNumber: this.phoneNumber
      },

      schoolId:
        this.selectedSchool!.id,

      stageId:
        this.selectedStage!.id,

      yearId:
        this.selectedYear!.id

    };

    console.log(
      'Complete Profile Data:',
      profileData
    );

    /*
      Later:

      this.profileService
        .completeProfile(profileData)
        .subscribe({
          next: () => {
            // navigate to next page
          },
          error: (error) => {
            console.error(error);
          }
        });
    */
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
      this.phoneNumber,
      this.selectedSchool?.id ? this.selectedSchool.id : null,
      this.selectedStage?.id ? this.selectedStage.id : null,
      this.selectedYear?.id ? this.selectedYear.id : null
    );
  }

  editStep(step: 'phone' | 'school' | 'stage' | 'year'): void {
    this.reviewMode = false;

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

  // Registration() {
  //   let Data = this.registerService.getData();
  //   this.accountService.register(Data).subscribe({
  //     next: (response) => {
  //       this.accountService.login({ email: Data.email, password: Data.password }).subscribe({
  //         next: (loginResponse) => {
  //           console.log('Login successful:', loginResponse);
  //           this.router.navigate(['/home']); // Navigate to the home after successful login
  //         },
  //         error: (loginError) => {
  //           console.error('Login failed:', loginError);
  //           // Handle login error, e.g., show an error message to the user
  //           alert(`Login failed: ${loginError.message}`);
  //         }
  //       });
  //     },
  //     error: (error) => {
  //       console.error('Registration failed:', error);
  //       // Handle registration error, e.g., show an error message to the user
  //       alert(`Registration failed: ${error.message}`);
  //     }
  //   });
  // }


Registration(): void {

  const Data = this.registerService.getData();
  Data.name = this.reviewName.trim();
  Data.email = this.reviewEmail.trim();
  Data.password = this.reviewPassword;
  Data.confirmPassword = this.reviewPassword;

  console.log('========== REGISTER DATA ==========');
  console.log(JSON.stringify(Data, null, 2));
  console.log('schoolId:', Data.schoolId);
  console.log('stageId:', Data.stageId);
  console.log('yearId:', Data.yearId);
  console.log('===================================');

  this.accountService.register(Data).subscribe({

    next: (response) => {

      console.log('Registration successful:', response);

      this.accountService.login({
        email: Data.email,
        password: Data.password
      }).subscribe({

        next: (loginResponse) => {
          console.log('Login successful:', loginResponse);
          this.router.navigate(['/profile/me']);
        },

        error: (loginError) => {

          console.error('Login failed:', loginError);

          alert(`Login failed: ${loginError.message}`);
        }

      });

    },

    error: (error) => {

      console.error('Registration failed:', error);

      // Check backend error details
      console.error('Backend error:', error.error);

      alert(
        error.error?.message ||
        error.error?.title ||
        'Registration failed'
      );

    }

  });
}


}