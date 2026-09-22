import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../../../features/home/components/navbar/navbar';
import { Footer } from '../../../features/home/components/footer/footer';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { DashboardService } from '../../../features/dashboard';
import {
  CourseCreateForm,
  CreateCourseRequest,
  CreateCourseResponse,
  LearningService,
  TeacherStage,
} from '../../../features/learning';

@Component({
  selector: 'app-upload-course-page',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Footer,
    LoadingSpinner,
    CourseCreateForm,
  ],
  templateUrl: './upload-course-page.html',
  styleUrl: './upload-course-page.css',
})
export class UploadCoursePage implements OnInit {
  private router = inject(Router);
  private learningService = inject(LearningService);
  private dashboardService = inject(DashboardService);

  stages = signal<TeacherStage[]>([]);
  teacherSchoolName = signal<string>('');
  isLoadingStages = signal<boolean>(true);
  isCreating = signal<boolean>(false);

  ngOnInit(): void {
    this.fetchTeacherStages();
  }

  fetchTeacherStages(): void {
    this.isLoadingStages.set(true);
    this.learningService.getTeacherStages().subscribe({
      next: (res: any) => {
        const schoolName = res?.teacherSchoolName;
        if (schoolName) {
          this.teacherSchoolName.set(schoolName);
        }

        if (res?.stages && res.stages.length > 0) {
          this.stages.set(res.stages);
          this.isLoadingStages.set(false);
        } else if (res?.teacherSchoolId) {
          this.loadStagesForSchool(res.teacherSchoolId, schoolName);
        } else {
          this.loadFallbackStages();
        }
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          this.isLoadingStages.set(false);
          this.router.navigate(['/restricted']);
          return;
        }
        this.loadFallbackStages();
      },
    });
  }

  private loadStagesForSchool(schoolId: string, schoolName?: string, fallbackStages?: TeacherStage[]): void {
    this.dashboardService.GetSchools().subscribe({
      next: (schools) => {
        this.isLoadingStages.set(false);
        const school = schools?.find((s) => s.id === schoolId);
        if (school && school.stages && school.stages.length > 0) {
          if (school.name) {
            this.teacherSchoolName.set(school.name);
          }
          const mappedStages: TeacherStage[] = school.stages.map((stg) => ({
            id: stg.id,
            name: stg.name,
            years: (stg.years || []).map((y) => ({ id: y.id, name: y.name })),
          }));
          this.stages.set(mappedStages);
        } else if (fallbackStages && fallbackStages.length > 0) {
          this.stages.set(fallbackStages);
        } else {
          this.loadFallbackStages();
        }
      },
      error: () => {
        if (fallbackStages && fallbackStages.length > 0) {
          this.stages.set(fallbackStages);
        }
        this.isLoadingStages.set(false);
      },
    });
  }

  private loadFallbackStages(): void {
    this.dashboardService.GetSchools().subscribe({
      next: (schools) => {
        this.isLoadingStages.set(false);
        if (!schools || schools.length === 0) return;

        const firstSchool = schools[0];
        if (firstSchool) {
          this.teacherSchoolName.set(firstSchool.name || '');
          const mappedStages: TeacherStage[] = (firstSchool.stages || []).map((stg) => ({
            id: stg.id,
            name: stg.name,
            years: (stg.years || []).map((y) => ({ id: y.id, name: y.name })),
          }));
          this.stages.set(mappedStages);
        }
      },
      error: (err) => {
        console.error('Failed to load fallback stages:', err);
        this.isLoadingStages.set(false);
      },
    });
  }

  onFormSubmit(data: CreateCourseRequest): void {
    if (!data || !data.name || !data.name.trim()) {
      alert('Please enter the course name.');
      return;
    }
    if (!data.stageId) {
      alert('Please select the educational stage.');
      return;
    }
    if (!data.yearId) {
      alert('Please select the academic year.');
      return;
    }

    this.isCreating.set(true);

    this.learningService.createCourse(data).subscribe({
      next: (res: CreateCourseResponse) => {
        this.isCreating.set(false);
        const courseId = res.courseId || res.id;
        if (!courseId) {
          alert('Course created, but unable to retrieve course ID.');
          this.router.navigate(['/manage-courses']);
          return;
        }

        // Navigate directly to the lesson upload page for this course
        this.router.navigate(['/manage-course-content', courseId]);
      },
      error: (err) => {
        this.isCreating.set(false);
        console.error('Course creation error details:', err);
        const serverMsg =
          err.error?.message ||
          (err.error?.errors ? Object.entries(err.error.errors).map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`).join(' | ') : null) ||
          err.error?.title ||
          (typeof err.error === 'string' ? err.error : null);
        alert(`Course creation failed: ${serverMsg || err.message || 'Error occurred'}`);
      },
    });
  }
}
