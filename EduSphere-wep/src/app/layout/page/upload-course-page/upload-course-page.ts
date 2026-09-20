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
  TeacherStagesResponse,
  VideoQueueItem,
  VideoQueueUploader,
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
    VideoQueueUploader,
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

  // Stored form data
  courseData = signal<CreateCourseRequest | null>(null);

  // Video queue
  queue = signal<VideoQueueItem[]>([]);

  // Sequential upload state
  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  currentUploadInfo = signal<string>('');

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
    this.courseData.set(data);
  }

  onFilesAdded(files: File[]): void {
    const currentQueue = [...this.queue()];
    files.forEach((file) => {
      const exists = currentQueue.some((item) => item.file.name === file.name && item.file.size === file.size);
      if (!exists) {
        currentQueue.push({
          file,
          title: file.name.replace(/\.[^/.]+$/, ''),
          sortOrder: currentQueue.length + 1,
          availabilityDays: 1,
        });
      }
    });
    this.queue.set(currentQueue);
  }

  onItemRemoved(index: number): void {
    const updated = [...this.queue()];
    updated.splice(index, 1);
    this.queue.set(updated);
  }

  onItemTitleChanged(event: { index: number; title: string }): void {
    const updated = [...this.queue()];
    if (updated[event.index]) {
      updated[event.index].title = event.title;
      this.queue.set(updated);
    }
  }

  onItemOrderChanged(event: { index: number; order: number }): void {
    const updated = [...this.queue()];
    if (updated[event.index]) {
      updated[event.index].sortOrder = event.order;
      this.queue.set(updated);
    }
  }

  onItemAttachmentsChanged(event: { index: number; attachments: File[] }): void {
    const updated = [...this.queue()];
    if (updated[event.index]) {
      updated[event.index].attachments = event.attachments;
      this.queue.set(updated);
    }
  }

  async onStartUpload(): Promise<void> {
    const data = this.courseData();
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

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.currentUploadInfo.set('Creating course on system...');

    this.learningService.createCourse(data).subscribe({
      next: async (res: CreateCourseResponse) => {
        const courseId = res.courseId || res.id;
        if (!courseId) {
          this.isUploading.set(false);
          alert('Unable to retrieve course ID.');
          return;
        }

        const items = this.queue();
        const total = items.length;

        if (total === 0) {
          this.uploadProgress.set(100);
          this.currentUploadInfo.set('Course created successfully!');
          setTimeout(() => {
            this.router.navigate(['/manage-course-content', courseId]);
          }, 800);
          return;
        }

        for (let i = 0; i < total; i++) {
          const item = items[i];
          const overall = Math.round(((i + 1) / total) * 100);
          this.uploadProgress.set(overall);
          this.currentUploadInfo.set(`Uploading lesson ${i + 1} of ${total}: "${item.title}"`);

          const formData = new FormData();
          formData.append('CourseId', courseId);
          formData.append('Title', item.title);
          formData.append('SortOrder', String(item.sortOrder));
          formData.append('AvailabilityDays', String(item.availabilityDays || 1));
          formData.append('VideoFile', item.file);

          if (item.attachments && item.attachments.length > 0) {
            for (const att of item.attachments) {
              formData.append('Attachments', att, att.name);
            }
          }

          try {
            await this.uploadSinglePromise(formData, courseId);
          } catch (e: any) {
            console.error('Failed uploading video item:', e);
          }
        }

        this.uploadProgress.set(100);
        this.currentUploadInfo.set('Course and all videos uploaded successfully!');
        setTimeout(() => {
          this.router.navigate(['/manage-course-content', courseId]);
        }, 1000);
      },
      error: (err) => {
        this.isUploading.set(false);
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

  private uploadSinglePromise(formData: FormData, courseId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.learningService.uploadVideo(formData).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err),
      });
    });
  }
}
