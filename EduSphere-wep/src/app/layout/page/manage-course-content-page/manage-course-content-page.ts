import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { Navbar } from '../../../features/home/components/navbar/navbar';
import { Footer } from '../../../features/home/components/footer/footer';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import {
  CourseContentHeader,
  CourseContentResponse,
  CourseSummary,
  LearningService,
  LessonVideo,
  VideoReorderList,
  VideoUploadForm,
} from '../../../features/learning';

@Component({
  selector: 'app-manage-course-content-page',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Footer,
    LoadingSpinner,
    CourseContentHeader,
    VideoReorderList,
    VideoUploadForm,
  ],
  templateUrl: './manage-course-content-page.html',
  styleUrl: './manage-course-content-page.css',
})
export class ManageCourseContentPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private learningService = inject(LearningService);

  courseId = signal<string>('');
  course = signal<CourseSummary | null>(null);
  videos = signal<LessonVideo[]>([]);

  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  // Transcription statuses map: videoId -> { status, label }
  transcriptionStatuses = signal<Record<string, { status: string; label: string }>>({});

  // Upload state
  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  progressBytes = signal<string>('');
  uploadStatusMessage = signal<{ text: string; isError: boolean } | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('courseId') || this.route.snapshot.queryParamMap.get('courseId');
      if (!id) {
        this.router.navigate(['/manage-courses']);
        return;
      }
      this.courseId.set(id);
      this.loadCourseContent(id);
    });
  }

  loadCourseContent(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.learningService.getCourseContent(id).subscribe({
      next: (res: CourseContentResponse) => {
        this.course.set(res.course || { id });
        const vids = res.videos || [];
        this.videos.set(vids);
        this.isLoading.set(false);

        // Check transcription statuses for videos
        vids.forEach((v) => this.checkTranscription(v.id));
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/restricted'], { queryParams: { courseId: id } });
          return;
        }
        this.errorMessage.set(err.message || 'Unable to load course content.');
      },
    });
  }

  checkTranscription(videoId: string): void {
    this.learningService.getTranscriptionStatus(videoId).subscribe({
      next: (res) => {
        const rawStatus = (res.status || '').toLowerCase();
        let label = `⏳ Transcription: ${rawStatus || 'Processing'}`;
        if (rawStatus === 'completed') {
          label = '✓ Transcribed (Deepgram)';
        } else if (rawStatus === 'failed') {
          label = '✕ Transcription failed';
        }

        this.transcriptionStatuses.update((prev) => ({
          ...prev,
          [videoId]: { status: rawStatus, label },
        }));
      },
      error: () => {},
    });
  }

  onSaveOrder(event: { videoId: string; newOrder: number }): void {
    this.learningService.reorderVideo({ videoId: event.videoId, sortOrder: event.newOrder }).subscribe({
      next: () => {
        alert('Order updated successfully.');
        this.loadCourseContent(this.courseId());
      },
      error: (err) => {
        alert(`Failed to update order: ${err.message || 'Error occurred'}`);
      },
    });
  }

  onUploadSubmit(formData: FormData): void {
    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.progressBytes.set('Starting upload...');
    this.uploadStatusMessage.set(null);

    const uploadId = 'up_' + Date.now();

    this.learningService.uploadVideoWithProgress(this.courseId(), formData, uploadId).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
            const totalMB = (event.total / (1024 * 1024)).toFixed(1);
            this.uploadProgress.set(percent);
            this.progressBytes.set(`${loadedMB} MB / ${totalMB} MB`);
          }
        } else if (event.type === HttpEventType.Response) {
          this.isUploading.set(false);
          this.uploadProgress.set(100);
          this.uploadStatusMessage.set({
            text: 'Lesson uploaded successfully and processing started on Bunny Stream.',
            isError: false,
          });
          this.loadCourseContent(this.courseId());
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadStatusMessage.set({
          text: `Upload failed: ${err.message || 'Network error'}`,
          isError: true,
        });
      },
    });
  }
}
