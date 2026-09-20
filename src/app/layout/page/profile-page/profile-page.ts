import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Navbar } from '../../../features/home/components/navbar/navbar';
import { Footer } from '../../../features/home/components/footer/footer';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { AccountService } from '../../../features/account/services/account.service';
import { AccountSummary } from '../../../features/account/models';
import { UserProfileHeader } from '../../../features/account/components/user-profile-header/user-profile-header';
import { UserEnrolledCourses } from '../../../features/account/components/user-enrolled-courses/user-enrolled-courses';
import { CourseListItem } from '../../../features/courses/models';
import { CoursesService } from '../../../features/courses/courses.service';
import { DashboardService } from '../../../features/dashboard';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Footer,
    LoadingSpinner,
    UserProfileHeader,
    UserEnrolledCourses,
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {
  private accountService = inject(AccountService);
  private coursesService = inject(CoursesService);
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  user = signal<AccountSummary | null>(null);
  availableCourses = signal<CourseListItem[]>([]);
  paidCoursesForCurrentYear = signal<CourseListItem[]>([]);
  activeTab = signal<'available' | 'paid'>('available');

  displayedCourses = computed<CourseListItem[]>(() =>
    this.activeTab() === 'paid' ? this.paidCoursesForCurrentYear() : this.availableCourses()
  );
  availableCount = computed<number>(() => this.availableCourses().length);
  paidCount = computed<number>(() => this.paidCoursesForCurrentYear().length);

  schoolName = signal<string>('');
  stageName = signal<string>('');
  yearName = signal<string>('');
  isStudent = signal<boolean>(true);
  nonStudentMessage = signal<string>('');

  isLoadingUser = signal<boolean>(true);
  isLoadingCourses = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // Check if route or query specifies tab
    const routeTab = this.route.snapshot.data?.['tab'];
    const queryTab = this.route.snapshot.queryParamMap.get('tab');
    if (routeTab === 'paid' || queryTab === 'paid') {
      this.activeTab.set('paid');
    } else {
      this.activeTab.set('available');
    }

    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'paid' || tab === 'available') {
        this.activeTab.set(tab);
      }
    });

    const currentUser = this.accountService.currentUser();
    if (currentUser && (currentUser.role?.toLowerCase() === 'teacher' || currentUser.isStudent === false)) {
      this.router.navigate(['/manage-courses']);
      return;
    }

    this.fetchProfile();
  }

  fetchProfile(): void {
    this.isLoadingUser.set(true);
    this.isLoadingCourses.set(true);
    this.errorMessage.set(null);

    this.accountService.getMe().subscribe({
      next: (userData) => {
        this.user.set(userData);
        this.isLoadingUser.set(false);

        // Resolve school, stage, year names from DashboardService if IDs exist
        if (userData.schoolId) {
          this.resolveNames(userData.schoolId, userData.stageId, userData.yearId);
        }

        // Determine if account is a student account
        let isStudentUser = true;
        let nonStudentNotice = '';

        if (userData.isStudent !== undefined) {
          isStudentUser = Boolean(userData.isStudent);
        } else if (userData.role) {
          isStudentUser = userData.role.toLowerCase() === 'student';
        } else if (userData.roles && userData.roles.length > 0) {
          isStudentUser = userData.roles.some((r) => r.toLowerCase() === 'student');
        } else if (userData.message && userData.message.toLowerCase().includes('not a student')) {
          isStudentUser = false;
          nonStudentNotice = userData.message;
        }

        if (!isStudentUser) {
          this.router.navigate(['/manage-courses']);
          return;
        }

        this.isStudent.set(true);
        this.nonStudentMessage.set('');

        if (userData.schoolId && userData.stageId && userData.yearId) {
          this.coursesService.getCourses(userData.schoolId, userData.stageId, userData.yearId).subscribe({
            next: (yearCourses) => {
              const paidList: any[] = userData.paidCourses || userData.courses || [];
              const paidSet = new Set(
                paidList.map((p: any) => String(p.courseId || p.id || '').trim().toLowerCase())
              );

              const mappedAvailable: CourseListItem[] = yearCourses.map((c) => ({
                ...c,
                id: String(c.id || ''),
                title: c.title || (c as any).name || 'Course',
                price: c.price ?? 0,
                isPaid: paidSet.has(String(c.id || '').trim().toLowerCase()),
              }));

              this.availableCourses.set(mappedAvailable);
              this.paidCoursesForCurrentYear.set(mappedAvailable.filter((c) => c.isPaid));
              this.isLoadingCourses.set(false);
            },
            error: (err) => {
              console.error('Failed to load courses for student grade:', err);
              const rawCourses = userData.paidCourses || userData.courses || [];
              const myCourses: CourseListItem[] = rawCourses.map((c: any) => ({
                id: String(c.courseId || c.id || ''),
                title: c.courseName || c.title || c.name || 'Enrolled Course',
                description: c.description || '',
                imageUrl: c.imageUrl || '',
                price: c.price ?? c.totalAmount ?? 0,
                isPaid: true,
                videosCount: c.videosCount ?? c.videos?.length ?? 0,
                videos: c.videos || [],
                teacherName: c.teacherName || '',
                sortOrder: c.sortOrder ?? 0,
              }));
              this.availableCourses.set(myCourses);
              this.paidCoursesForCurrentYear.set(myCourses);
              this.isLoadingCourses.set(false);
            },
          });
        } else {
          const rawCourses = userData.paidCourses || userData.courses || [];
          const myCourses: CourseListItem[] = rawCourses.map((c: any) => ({
            id: String(c.courseId || c.id || ''),
            title: c.courseName || c.title || c.name || 'Enrolled Course',
            description: c.description || '',
            imageUrl: c.imageUrl || '',
            price: c.price ?? c.totalAmount ?? 0,
            isPaid: true,
            videosCount: c.videosCount ?? c.videos?.length ?? 0,
            videos: c.videos || [],
            teacherName: c.teacherName || '',
            sortOrder: c.sortOrder ?? 0,
          }));
          this.availableCourses.set(myCourses);
          this.paidCoursesForCurrentYear.set(myCourses);
          this.isLoadingCourses.set(false);
        }
      },
      error: (err) => {
        this.isLoadingUser.set(false);
        this.isLoadingCourses.set(false);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/auth/login']);
          return;
        }
        if (err.status === 404) {
          this.router.navigate(['/manage-courses']);
          return;
        }
        this.errorMessage.set('Failed to load profile.');
      },
    });
  }

  onTabChange(tab: 'available' | 'paid'): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  private resolveNames(schoolId: string, stageId?: string, yearId?: string): void {
    this.dashboardService.GetSchools().subscribe({
      next: (schools) => {
        const school = schools.find((s) => s.id === schoolId);
        if (!school) return;
        this.schoolName.set(school.name);

        if (stageId) {
          const stage = school.stages?.find((stg) => stg.id === stageId);
          if (stage) {
            this.stageName.set(stage.name);
            if (yearId) {
              const year = stage.years?.find((yr) => yr.id === yearId);
              if (year) {
                this.yearName.set(year.name);
              }
            }
          }
        }
      },
      error: (e) => console.error('Failed to resolve school names:', e),
    });
  }

  onLogout(): void {
    this.accountService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.router.navigate(['/auth/login']);
      },
    });
  }
}
