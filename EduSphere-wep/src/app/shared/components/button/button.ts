import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../../../features/account/services/account.service';
import { CoursesService } from '../../../features/courses/courses.service';
import { CourseListItem } from '../../../features/courses/models';

@Component({
  selector: 'app-button',
  imports: [CommonModule],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly coursesService = inject(CoursesService);
  private readonly router = inject(Router);

  readonly course = input<CourseListItem | undefined>(undefined);
  readonly courseId = input<string | undefined>(undefined);
  readonly buttonClass = input<string>('btn course-action-btn w-100');
  readonly price = input<number | undefined>(undefined);

  readonly action = output<void>();

  readonly targetCourseId = computed<string>(() => {
    const explicitId = this.courseId();
    if (explicitId) {
      return explicitId.trim();
    }
    const c = this.course();
    return (c?.id || '').trim();
  });

  readonly hasAccess = computed<boolean>(() => {
    const c = this.course();
    if (c?.isPaid) {
      return true;
    }

    const user = this.accountService.currentUser();
    if (!user) {
      return false;
    }

    const paidList: any[] = user.paidCourses || (user as any).PaidCourses || user.courses || [];
    if (!paidList || paidList.length === 0) {
      return false;
    }

    const currentId = this.targetCourseId().toLowerCase();
    if (!currentId) {
      return false;
    }

    return paidList.some((enrolled: any) => {
      const id = String(enrolled.courseId || enrolled.id || '').trim().toLowerCase();
      return id === currentId;
    });
  });

  readonly isCourseAvailable = computed<boolean>(() => {
    if (this.hasAccess()) {
      return true;
    }

    const user = this.accountService.currentUser();
    // Guests or non-students are not blocked by grade restriction at button level
    if (!user || user.isStudent === false) {
      return true;
    }

    // If user lacks school/stage/year, cannot restrict
    if (!user.schoolId || !user.stageId || !user.yearId) {
      return true;
    }

    // If available courses have been loaded for this student, check membership
    if (this.coursesService.hasLoadedAvailable()) {
      const currentId = this.targetCourseId().toLowerCase();
      if (!currentId) return true;
      return this.coursesService.studentAvailableCourseIds().has(currentId);
    }

    return true;
  });

  readonly buttonLabel = computed<string>(() => {
    if (this.hasAccess()) {
      return 'Go to Course';
    }
    if (!this.isCourseAvailable()) {
      return 'Not Available for Your Grade';
    }
    return 'Pay Now';
  });

  readonly buttonIcon = computed<string>(() => {
    if (this.hasAccess()) {
      return 'fa fa-play-circle me-2';
    }
    if (!this.isCourseAvailable()) {
      return 'fa fa-ban me-2';
    }
    return 'fa fa-credit-card me-2';
  });

  ngOnInit(): void {
    const user = this.accountService.currentUser();
    if (!user) {
      this.accountService.checkAuth().subscribe((loadedUser) => {
        if (loadedUser?.schoolId && loadedUser?.stageId && loadedUser?.yearId) {
          this.coursesService.loadStudentAvailableCourses(
            loadedUser.schoolId,
            loadedUser.stageId,
            loadedUser.yearId
          ).subscribe();
        }
      });
    } else if (user.schoolId && user.stageId && user.yearId && !this.coursesService.hasLoadedAvailable()) {
      this.coursesService.loadStudentAvailableCourses(
        user.schoolId,
        user.stageId,
        user.yearId
      ).subscribe();
    }
  }

  onClick(): void {
    const cId = this.targetCourseId();

    if (this.hasAccess()) {
      if (cId) {
        this.router.navigate(['/lesson', cId]);
      }
      this.action.emit();
      return;
    }

    if (!this.isCourseAvailable()) {
      alert('This course is not available for your educational stage and academic year. You may view course details, but enrollment is restricted to eligible students.');
      return;
    }

    if (!this.accountService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: cId ? `/course/${cId}` : '/home' },
      });
      return;
    }

    this.action.emit();
  }
}
