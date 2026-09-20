import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoItem } from '../../../videos/models/index';
import { CourseListItem } from '../../models/index';
import { CoursesService } from '../../courses.service';
import { LoadingSpinner } from "../../../../shared/components/loading-spinner/loading-spinner";
import { AccountService } from '../../../account/services/account.service';
import { Button } from '../../../../shared/components/button';

interface VideoDisplayItem extends VideoItem {
  studentsCount?: number;
}

@Component({
  imports: [CommonModule, LoadingSpinner, Button],
  selector: 'app-course-details',
  styleUrl: './course-details.css',
  templateUrl: './course-details.html',
})
export class CourseDetails implements OnInit {

  private coursesService = inject(CoursesService);
  private accountService = inject(AccountService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  courseId = input<string | undefined>(undefined);

  readonly resolvedCourseId = signal<string | null>(null);

  course = signal<CourseListItem | undefined>(undefined);
  isLoading = signal<boolean>(false);
  courseNotFound = signal<boolean>(false);

  defaultCourseImage =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
        <rect width="800" height="450" fill="#eef0f5"/>
        <circle cx="400" cy="180" r="60" fill="#d7d9e3"/>
        <rect x="280" y="260" width="240" height="110" rx="14" fill="#d7d9e3"/>
        <text x="400" y="410" font-family="Arial, sans-serif" font-size="22" fill="#6b7280" text-anchor="middle">No Image Available</text>
      </svg>
    `);

  ngOnInit(): void {
    if (!this.accountService.currentUser()) {
      this.accountService.checkAuth().subscribe();
    }

    this.isLoading.set(true);
    const inputId = this.courseId();
    if (inputId) {
      this.resolvedCourseId.set(inputId);
      this.fetchCourse(inputId);
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const id = params.get('courseId') || params.get('id');

      if (!id) {
        console.error('CourseDetails: no course id found in route or input.');
        this.isLoading.set(false);
        this.courseNotFound.set(true);
        this.router.navigate(['/home']);
        return;
      }

      this.resolvedCourseId.set(id);
      this.fetchCourse(id);
    });
  }

  private fetchCourse(id: string): void {
    this.isLoading.set(true);
    this.courseNotFound.set(false);
    this.course.set(undefined);

    this.coursesService.getCourseById(id).subscribe({
      next: (course) => {
        if (!course) {
          this.checkEnrolledFallback(id);
          return;
        }

        this.course.set(course);
      },
      error: (err) => {
        console.error('Failed to load course:', err);
        this.checkEnrolledFallback(id);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  private checkEnrolledFallback(id: string): void {
    const user = this.accountService.currentUser();
    const cleanId = id.trim().toLowerCase();
    const paidList: any[] = user?.paidCourses || (user as any)?.PaidCourses || user?.courses || [];
    const enrolled = paidList.find(
      (c: any) => String(c.courseId || c.id || '').trim().toLowerCase() === cleanId
    );

    if (enrolled) {
      this.course.set({
        id: String(enrolled.courseId || enrolled.id || id),
        title: enrolled.courseName || enrolled.title || enrolled.name || 'Enrolled Course',
        description: enrolled.description || 'Enrolled student course on EduSphere.',
        price: enrolled.price ?? 0,
        isPaid: true,
        imageUrl: enrolled.imageUrl || '',
        videosCount: enrolled.videosCount ?? enrolled.videos?.length ?? 0,
        videos: enrolled.videos || [],
        teacherName: enrolled.teacherName || '',
      });
      this.courseNotFound.set(false);
      this.isLoading.set(false);
      return;
    }

    this.courseNotFound.set(true);
    this.isLoading.set(false);
  }

  // ===================================

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== this.defaultCourseImage) {
      img.src = this.defaultCourseImage;
    }
  }

  isLoggedIn(): boolean {
    return this.accountService.isAuthenticated();
  }

  readonly hasAccess = computed<boolean>(() => {
    if (!this.isLoggedIn()) {
      return false;
    }
    const currentCourse = this.course();
    if (currentCourse?.isPaid) {
      return true;
    }
    const user = this.accountService.currentUser();
    if (!user) {
      return false;
    }
    const paidList: any[] = user.paidCourses || (user as any).PaidCourses || user.courses || [];
    const targetId = (this.resolvedCourseId() || currentCourse?.id || this.courseId() || '').trim().toLowerCase();
    if (!targetId) {
      return false;
    }
    return paidList.some((enrolled: any) => {
      const id = String(enrolled.courseId || enrolled.id || '').trim().toLowerCase();
      return id === targetId;
    });
  });

  getButtonLabel(): string {
    return this.hasAccess() ? 'Go to Course' : 'Pay Now';
  }

  getFormattedPrice(): string {
    const price = this.course()?.price;
    if (price === undefined || price === null) {
      return 'Free';
    }
    return `${price} EGP`;
  }

  getSortedVideos(): VideoDisplayItem[] {
    const videos = this.course()?.videos ?? [];
    return [...videos].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  isVideoLocked(): boolean {
    return !this.hasAccess();
  }

  formatUploadDate(createdAt?: string): string {
    if (!createdAt) {
      return 'Upload date unavailable';
    }
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) {
      return 'Upload date unavailable';
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  onVideoClick(video: VideoDisplayItem): void {
    if (this.isVideoLocked()) {
      return;
    }
    const cId = this.resolvedCourseId() || this.course()?.id;
    if (cId) {
      this.router.navigate(['/lesson', cId]);
    }
  }

  onActionClick(): void {
    const course = this.course();
    if (!course) return;

    if (this.hasAccess()) {
      const cId = this.resolvedCourseId() || course.id;
      this.router.navigate(['/lesson', cId]);
      return;
    }

    if (!this.isLoggedIn()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/course/${this.resolvedCourseId()}` }
      });
      return;
    }

    alert(`Preparing checkout for course: ${course.title} (${this.getFormattedPrice()})`);
  }
}