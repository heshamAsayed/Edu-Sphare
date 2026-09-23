import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AccountService } from '../../../features/account/services/account.service';
import {
  CoursePaymentSummary,
  DashboardService,
  TeacherCourse,
} from '../../../features/dashboard';
import { LearningService, LessonResponse, TeacherStatisticsItem } from '../../../features/learning';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

interface CourseInsight extends TeacherCourse {
  students: number;
  focus: number;
  attendance: number;
  averageGrade: number;
  videoGrades: { label: string; value: number }[];
  videos: number;
  loading: boolean;
}

interface IncomeCourseRow {
  courseId: string;
  courseName: string;
  studentsCount: number;
  price: number;
  totalAmount: number;
}

@Component({
  selector: 'app-teacher-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinner],
  templateUrl: './teacher-dashboard-page.html',
  styleUrl: './teacher-dashboard-page.css',
})
export class TeacherDashboardPage implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly learning = inject(LearningService);
  private readonly account = inject(AccountService);
  private readonly router = inject(Router);

  readonly activeTab = signal<'overview' | 'courses' | 'performance' | 'attendance' | 'income'>('overview');
  readonly teacherName = signal('Teacher');
  readonly teacherEmail = signal('');
  readonly teacherId = signal<string | null>(null);
  readonly profileMenuOpen = signal(false);

  readonly courses = signal<CourseInsight[]>([]);
  readonly coursesLoading = signal(true);
  readonly financialLoading = signal(true);
  readonly insightsLoading = signal(false);
  readonly reportByCourse = signal<CoursePaymentSummary[]>([]);
  readonly selectedCourseId = signal('all');
  readonly showAllCourses = signal(false);

  /** Only this teacher's courses — students, original price, and income per course */
  readonly financialCourses = computed<IncomeCourseRow[]>(() => {
    const mine = this.courses();
    const reportMap = new Map(this.reportByCourse().map(r => [r.courseId, r]));

    return mine.map(c => {
      const r = reportMap.get(c.id);
      return {
        courseId: c.id,
        courseName: this.courseName(c),
        studentsCount: r?.studentsCount ?? c.students ?? 0,
        price: r?.price ?? c.price ?? 0,
        totalAmount: r?.totalAmount ?? 0,
      };
    });
  });

  readonly totalIncome = computed(() =>
    this.financialCourses().reduce((sum, c) => sum + (c.totalAmount || 0), 0)
  );

  readonly selectedCourses = computed(() =>
    this.selectedCourseId() === 'all'
      ? this.courses()
      : this.courses().filter(c => c.id === this.selectedCourseId())
  );

  readonly totalStudents = computed(() =>
    this.courses().reduce((sum, c) => sum + c.students, 0)
  );

  readonly avgFocus = computed(() =>
    this.averageOrZero(this.selectedCourses().map(c => c.focus))
  );

  readonly avgAttendance = computed(() =>
    this.averageOrZero(this.selectedCourses().map(c => c.attendance))
  );

  readonly gradeItems = computed(() =>
    this.selectedCourseId() === 'all'
      ? this.courses().map(c => ({ label: this.courseName(c), value: c.averageGrade }))
      : this.selectedCourses()[0]?.videoGrades || []
  );

  readonly gradePoints = computed(() => {
    const items = this.gradeItems();
    if (!items.length) return '';
    return items
      .map((item, index, all) => {
        const x = all.length <= 1 ? 50 : 5 + (index * 90) / (all.length - 1);
        const y = 100 - (item.value ?? 0);
        return `${x},${y}`;
      })
      .join(' ');
  });

  readonly visibleFinancialCourses = computed(() =>
    this.showAllCourses()
      ? this.financialCourses()
      : this.financialCourses().slice(0, 10)
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.dashboard
      .getCurrentTeacher()
      .pipe(catchError(() => of({ id: '', name: 'Teacher', email: '' })))
      .subscribe(t => {
        this.teacherName.set(t.name || 'Teacher');
        this.teacherEmail.set(t.email || this.account.currentUser()?.email || '');
        this.teacherId.set(t.id || null);
        this.loadFinancial(t.id || null);
      });

    // Prefer Learning/ManageCourses (instructor API), fall back to Dashboard Teacher/Courses
    this.learning
      .getManageCourses()
      .pipe(
        map(res =>
          (res.courses || []).map(
            (c): TeacherCourse => ({
              id: c.id,
              name: c.name,
              title: c.name,
              price: c.price,
              videosCount: c.videosCount,
              createdAt: c.createdAt,
            })
          )
        ),
        catchError(() =>
          this.dashboard.getCurrentTeacherCourses().pipe(catchError(() => of([] as TeacherCourse[])))
        )
      )
      .subscribe(items => {
        this.coursesLoading.set(false);
        const list = (items || []).filter(c => !!c?.id);
        this.courses.set(
          list.map(c => ({
            ...c,
            students: 0,
            focus: 0,
            attendance: 0,
            averageGrade: 0,
            videoGrades: [],
            videos: c.videosCount || 0,
            loading: true,
          }))
        );
        this.loadInsights(list);
      });
  }

  private loadFinancial(teacherId: string | null): void {
    this.financialLoading.set(true);

    const report$ = teacherId
      ? this.dashboard.getFinancialReport({ teacherId })
      : this.dashboard.getFinancialReport();

    report$.pipe(catchError(() => of(null))).subscribe(report => {
      this.financialLoading.set(false);
      if (!report) {
        this.reportByCourse.set([]);
        return;
      }

      const teacherRow = teacherId
        ? (report.byTeacher || []).find(t => t.teacherId === teacherId)
        : report.byTeacher?.[0];

      const rows =
        teacherRow?.courses?.length
          ? teacherRow.courses
          : (report.byCourse || []);

      this.reportByCourse.set(rows);
    });
  }

  /** Loads focus / grades / attendance via Learning/Lesson (includes teacherStatistics). */
  private loadInsights(items: TeacherCourse[]): void {
    if (!items.length) {
      this.insightsLoading.set(false);
      return;
    }

    this.insightsLoading.set(true);
    let pending = items.length;

    for (const course of items) {
      this.learning.getLesson(course.id).subscribe({
        next: lesson => {
          const insight = this.toInsight(course, lesson);
          this.courses.update(list =>
            list.map(c => (c.id === course.id ? { ...insight, loading: false } : c))
          );
          if (--pending <= 0) this.insightsLoading.set(false);
        },
        error: () => {
          // No lesson/stats available → treat as zero metrics (no videos / no measurable data)
          this.courses.update(list =>
            list.map(c =>
              c.id === course.id
                ? {
                    ...c,
                    students: 0,
                    focus: 0,
                    attendance: 0,
                    averageGrade: 0,
                    videoGrades: [],
                    videos: c.videosCount || 0,
                    loading: false,
                  }
                : c
            )
          );
          if (--pending <= 0) this.insightsLoading.set(false);
        },
      });
    }
  }

  /**
   * Maps Learning/Lesson response → dashboard metrics.
   * API returns null averages when nobody watched / no quiz scores.
   * No videos or empty stats ⇒ 0 (not "—").
   */
  private toInsight(
    course: TeacherCourse,
    lesson: LessonResponse
  ): Omit<CourseInsight, 'loading'> {
    const videos = lesson.videos || [];
    const stats = lesson.teacherStatistics || [];
    const byVideo = new Map(stats.map(s => [s.videoId, s]));

    const enrolled = stats.map(s => s.enrolledStudentsCount || 0);
    const students = enrolled.length ? Math.max(...enrolled) : 0;

    // No videos ⇒ nothing to evaluate ⇒ all zeros
    if (!videos.length && !stats.length) {
      return {
        ...course,
        students,
        focus: 0,
        attendance: 0,
        averageGrade: 0,
        videoGrades: [],
        videos: 0,
        price: course.price ?? lesson.course?.price ?? 0,
        name: course.name || lesson.course?.name || course.title,
        title: course.title || lesson.course?.title || course.name,
      };
    }

    return {
      ...course,
      students,
      focus: this.averageOrZero(stats.map(s => s.averageFocusPercent)),
      attendance: this.attendancePercent(stats),
      averageGrade: this.averageOrZero(stats.map(s => s.averagePostVideoQuizScore)),
      videoGrades: videos.map((v, i) => ({
        label: v.title || `Video ${i + 1}`,
        value: this.toNumber(byVideo.get(v.id)?.averagePostVideoQuizScore) ?? 0,
      })),
      videos: videos.length || course.videosCount || 0,
      price: course.price ?? lesson.course?.price ?? 0,
      name: course.name || lesson.course?.name || course.title,
      title: course.title || lesson.course?.title || course.name,
    };
  }

  /** Attendance = watched / enrolled × 100. No enrollments ⇒ 0. */
  private attendancePercent(stats: TeacherStatisticsItem[]): number {
    if (!stats.length) return 0;

    const ratios = stats
      .map(s => {
        const enrolled = s.enrolledStudentsCount || 0;
        if (enrolled <= 0) return null;
        const watched = s.watchedStudentsCount || 0;
        return (watched * 100) / enrolled;
      })
      .filter((v): v is number => v != null);

    return ratios.length ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length) : 0;
  }

  /** Averages numeric values; null/empty (no measurable data) ⇒ 0. */
  private averageOrZero(values: Array<number | null | undefined | string>): number {
    const valid = values
      .map(v => this.toNumber(v))
      .filter((v): v is number => v != null);
    return valid.length
      ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
      : 0;
  }

  private toNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  courseName(course: TeacherCourse): string {
    return course.name || course.title || 'Untitled course';
  }

  selectCourse(event: Event): void {
    this.selectedCourseId.set((event.target as HTMLSelectElement).value);
  }

  chartLabel(index: number): string {
    return this.selectedCourseId() === 'all' ? `Course ${index + 1}` : `Video ${index + 1}`;
  }

  openCourse(course: CourseInsight): void {
    this.router.navigate(['/manage-course-content', course.id]);
  }

  logout(): void {
    this.account.logout().subscribe(() => this.router.navigate(['/auth/login']));
  }

  downloadReport(): void {
    const teacherId = this.teacherId();
    const req = teacherId
      ? this.dashboard.downloadReportPdf({ teacherId })
      : this.dashboard.downloadCurrentTeacherReport();

    req.subscribe(file => {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'teacher-financial-report.pdf';
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}
