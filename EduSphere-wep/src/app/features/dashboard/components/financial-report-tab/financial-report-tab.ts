import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../dashboard.service';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import {
  FinancialReport,
  FinancialReportFilter,
  TeacherPaymentSummary,
  DashboardTeacher,
} from '../../models';

interface CourseOption {
  id: string;
  name: string;
  teacherId?: string;
}

@Component({
  selector: 'app-financial-report-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinner, Pagination],
  templateUrl: './financial-report-tab.html',
  styleUrl:    './financial-report-tab.css',
})
export class FinancialReportTab implements OnInit {
  private svc = inject(DashboardService);

  // ── Filters ───────────────────────────────────────────────────────────────
  selectedTeacherId = signal('');
  selectedCourseId  = signal('');
  fromDate          = '';

  // ── Reference data ────────────────────────────────────────────────────────
  teachers   = signal<DashboardTeacher[]>([]);
  allCourses = signal<CourseOption[]>([]);

  // ── Report data ───────────────────────────────────────────────────────────
  report     = signal<FinancialReport | null>(null);
  loading    = signal(false);
  errorMsg   = signal<string | null>(null);
  pdfLoading = signal(false);

  // Paged rows for the teacher-summary table
  pagedTeachers = signal<TeacherPaymentSummary[]>([]);

  // ── Computed: course dropdown — filtered by selected teacher ──────────────
  filteredCourses = computed<CourseOption[]>(() => {
    const teacherId = this.selectedTeacherId();
    const fromApi = this.allCourses();
    const teachers = this.teachers();

    // Prefer teacher.courses from GetAllTeachers (authoritative ownership),
    // then fall back to Courses API teacherId.
    const fromTeachers: CourseOption[] = [];
    for (const t of teachers) {
      if (!t.id || !t.courses?.length) continue;
      if (teacherId && t.id !== teacherId) continue;
      for (const c of t.courses) {
        fromTeachers.push({
          id: c.id,
          name: c.name || c.title || 'Untitled',
          teacherId: t.id,
        });
      }
    }

    const fromCoursesApi = (!teacherId
      ? fromApi
      : fromApi.filter(c => c.teacherId === teacherId)
    ).map(c => ({ id: c.id, name: c.name, teacherId: c.teacherId }));

    const source = fromTeachers.length ? fromTeachers : fromCoursesApi;
    const seen = new Set<string>();
    return source
      .filter(c => {
        if (!c.id || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // ── Summary shortcut ──────────────────────────────────────────────────────
  summary = computed(() => this.report()?.summary ?? null);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.svc.getAllTeachers().subscribe({ next: t => this.teachers.set(t) });

    this.svc.getAllCourses().subscribe({
      next: courses => this.allCourses.set(
        (courses || []).map(c => ({
          id: c.id,
          name: c.name || c.title || 'Untitled',
          teacherId: c.teacherId,
        }))
      ),
      error: () => this.allCourses.set([]),
    });

    this.fetch();
  }

  // ── Fetch report ──────────────────────────────────────────────────────────
  fetch(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    const f: FinancialReportFilter = {};
    if (this.selectedTeacherId()) f.teacherId = this.selectedTeacherId();
    if (this.selectedCourseId())  f.courseId  = this.selectedCourseId();
    if (this.fromDate)            f.fromDate  = this.fromDate;

    this.svc.getFinancialReport(f).subscribe({
      next: r => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || err.message || 'Failed to load report.');
      },
    });
  }

  // ── Reset filter ──────────────────────────────────────────────────────────
  reset(): void {
    this.selectedTeacherId.set('');
    this.selectedCourseId.set('');
    this.fromDate = '';
    this.fetch();
  }

  // ── Teacher change: reset course filter ──────────────────────────────────
  onTeacherChange(teacherId: string): void {
    this.selectedTeacherId.set(teacherId);
    this.selectedCourseId.set('');
  }

  onCourseChange(courseId: string): void {
    this.selectedCourseId.set(courseId);
  }

  // ── Print (prints only the filtered section) ─────────────────────────────
  print(): void { window.print(); }

  // ── PDF download ─────────────────────────────────────────────────────────
  downloadPdf(): void {
    this.pdfLoading.set(true);
    const f: FinancialReportFilter = {};
    if (this.selectedTeacherId()) f.teacherId = this.selectedTeacherId();
    if (this.selectedCourseId())  f.courseId  = this.selectedCourseId();
    if (this.fromDate)            f.fromDate  = this.fromDate;

    this.svc.downloadReportPdf(f).subscribe({
      next: blob => {
        this.pdfLoading.set(false);
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `financial-report-${new Date().toISOString().slice(0,10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.pdfLoading.set(false),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  hasFilter(): boolean {
    return !!(this.selectedTeacherId() || this.selectedCourseId() || this.fromDate);
  }

  teacherRows = computed<TeacherPaymentSummary[]>(() =>
    this.report()?.byTeacher ?? []
  );
}
