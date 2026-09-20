import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CourseListItem } from '../../../courses/models';

@Component({
  selector: 'app-user-enrolled-courses',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-enrolled-courses.html',
  styleUrl: './user-enrolled-courses.css',
})
export class UserEnrolledCourses {
  readonly courses = input<CourseListItem[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly isStudent = input<boolean>(true);
  readonly nonStudentMessage = input<string>('');
  readonly activeTab = input<'available' | 'paid'>('available');
  readonly availableCount = input<number>(0);
  readonly paidCount = input<number>(0);

  readonly tabChange = output<'available' | 'paid'>();

  readonly defaultCourseImage =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
        <rect width="800" height="450" fill="#f8f9fb"/>
        <circle cx="400" cy="180" r="60" fill="#e5e7eb"/>
        <rect x="280" y="260" width="240" height="110" rx="14" fill="#e5e7eb"/>
        <text x="400" y="410" font-family="Arial, sans-serif" font-size="22" fill="#6b7280" text-anchor="middle">EduSphere Course</text>
      </svg>
    `);

  onTabClick(tab: 'available' | 'paid'): void {
    this.tabChange.emit(tab);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== this.defaultCourseImage) {
      img.src = this.defaultCourseImage;
    }
  }
}
