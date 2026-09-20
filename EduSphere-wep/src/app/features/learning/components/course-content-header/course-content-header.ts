import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CourseSummary } from '../../models';

@Component({
  selector: 'app-course-content-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-content-header.html',
  styleUrl: './course-content-header.css',
})
export class CourseContentHeader {
  course = input<CourseSummary | null>(null);
  videosCount = input<number>(0);
}
