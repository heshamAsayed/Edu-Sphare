import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
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
  VideoQueueItem,
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
  @ViewChild(VideoUploadForm) uploadFormRef?: VideoUploadForm;

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
  currentUploadInfo = signal<string>('');
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

  async onUploadBatchSubmit(items: VideoQueueItem[]): Promise<void> {
    if (!items || items.length === 0) return;

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.progressBytes.set('');
    this.uploadStatusMessage.set(null);

    const total = items.length;

    for (let i = 0; i < total; i++) {
      const item = items[i];
      this.currentUploadInfo.set(`Uploading video ${i + 1} of ${total}: "${item.title}"`);
      this.uploadProgress.set(0);

      try {
        await this.uploadSingleQueueItem(item, i, total);
      } catch (err: any) {
        this.isUploading.set(false);
        this.uploadStatusMessage.set({
          text: `Failed to upload "${item.title}": ${err.message || 'Network error occurred'}`,
          isError: true,
        });
        // Reload course content to show any videos successfully uploaded so far
        this.loadCourseContent(this.courseId());
        return;
      }
    }

    this.isUploading.set(false);
    this.uploadProgress.set(100);
    this.currentUploadInfo.set('');
    this.uploadStatusMessage.set({
      text: `All ${total} video(s) have been successfully uploaded and saved!`,
      isError: false,
    });

    // Reload content
    this.loadCourseContent(this.courseId());
    // Clear queue in form component
    this.uploadFormRef?.clearQueue();
  }

  private uploadSingleQueueItem(item: VideoQueueItem, index: number, total: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('CourseId', this.courseId());
      formData.append('Title', item.title.trim());
      formData.append('Description', (item.description || '').trim());
      formData.append('SortOrder', String(item.sortOrder));
      formData.append('AvailabilityDays', String(item.availabilityDays || 1));
      formData.append('VideoFile', item.file);

      (item.attachments || []).forEach((att) => {
        formData.append('Attachments', att);
      });

      const uploadId = `up_${Date.now()}_${index}`;

      this.learningService.uploadVideoWithProgress(this.courseId(), formData, uploadId).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
            const totalMB = (event.total / (1024 * 1024)).toFixed(1);
            this.uploadProgress.set(percent);
            this.progressBytes.set(`Video ${index + 1} of ${total} | ${loadedMB} MB / ${totalMB} MB`);
            this.currentUploadInfo.set(`Uploading video ${index + 1} of ${total}: "${item.title}" (${percent}%)`);
          } else if (event.type === HttpEventType.Response) {
            resolve();
          }
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }
}

