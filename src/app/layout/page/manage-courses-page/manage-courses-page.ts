import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../../features/home/components/navbar/navbar';
import { Footer } from '../../../features/home/components/footer/footer';
import {
  LearningService,
  ManageCourseItem,
  ManageCourseList,
  ManageCoursesResponse,
  TeacherMetaBanner,
  TeacherStage,
} from '../../../features/learning';

@Component({
  selector: 'app-manage-courses-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Navbar,
    Footer,
    TeacherMetaBanner,
    ManageCourseList,
  ],
  templateUrl: './manage-courses-page.html',
  styleUrl: './manage-courses-page.css',
})
export class ManageCoursesPage implements OnInit {
  private router = inject(Router);
  private learningService = inject(LearningService);

  courses = signal<ManageCourseItem[]>([]);
  teacherSchoolName = signal<string | null>(null);
  stages = signal<TeacherStage[]>([]);

  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchCourses();
  }

  fetchCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.learningService.getManageCourses().subscribe({
      next: (res: ManageCoursesResponse) => {
        this.courses.set(res.courses || []);
        this.teacherSchoolName.set(res.teacherSchoolName || null);
        this.stages.set(res.stages || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/restricted']);
          return;
        }
        this.errorMessage.set(err.message || 'An error occurred while loading courses.');
      },
    });
  }
}
