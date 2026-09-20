import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ManageCourseItem } from '../../models';

@Component({
  selector: 'app-manage-course-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './manage-course-list.html',
  styleUrl: './manage-course-list.css',
})
export class ManageCourseList {
  courses = input<ManageCourseItem[]>([]);
  isLoading = input<boolean>(false);
  errorMessage = input<string | null>(null);

  retry = output<void>();

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0] || dateStr;
  }
}
