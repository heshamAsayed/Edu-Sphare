import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../dashboard.service';
import { CoursesService } from '../../../courses/courses.service';
import { CourseListItem } from '../../../courses/models';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { DashboardTeacher, School, Stage, Year } from '../../models';

interface TeacherForm {
  name:        string;
  email:       string;
  phoneNumber: string;
  userName:    string;
  password:    string;
  schoolId:    string;
  stageIds:    string[];
  yearIds:     string[];
}

@Component({
  selector: 'app-teachers-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinner, Pagination],
  templateUrl: './teachers-tab.html',
  styleUrl:    './teachers-tab.css',
})
export class TeachersTab implements OnInit {
  private svc = inject(DashboardService);
  private coursesService = inject(CoursesService);

  // ── State ────────────────────────────────────────────────────────────────
  teachers       = signal<DashboardTeacher[]>([]);
  allCourses     = signal<CourseListItem[]>([]);
  schools        = signal<School[]>([]);
  stages         = signal<Stage[]>([]);
  years          = signal<Year[]>([]);
  pagedTeachers  = signal<DashboardTeacher[]>([]);

  loadingTeachers = signal(true);
  loadingSchools  = signal(true);
  loadingStages   = signal(false);
  loadingYears    = signal(false);
  addLoading      = signal(false);
  removeLoadingId = signal<string | null>(null);

  successMsg = signal<string | null>(null);
  errorMsg   = signal<string | null>(null);

  showForm = signal(false);

  form: TeacherForm = this.blankForm();

  // ── Computed: Teachers with actual course counts ──────────────────────────
  teachersWithCourses = computed(() => {
    const teachers = this.teachers();
    const courses = this.allCourses();
    const coursesByTeacher = new Map<string, number>();

    for (const course of courses) {
      const teacherId = course.teacherId;
      if (teacherId) {
        coursesByTeacher.set(teacherId, (coursesByTeacher.get(teacherId) ?? 0) + 1);
      }
    }

    return teachers.map(t => ({
      ...t,
      coursesCount: t.coursesCount || coursesByTeacher.get(t.id!) || t.courses?.length || 0,
    }));
  });

  // ── Computed ─────────────────────────────────────────────────────────────
  canSubmit = computed(() =>
    !!this.form.name && !!this.form.email && !!this.form.password &&
    !!this.form.schoolId && this.form.stageIds.length > 0 && this.form.yearIds.length > 0 &&
    !this.addLoading()
  );

  selectedSchoolStages = computed(() =>
    this.stages().filter(s => s.schoolId === this.form.schoolId)
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadTeachers();
    this.coursesService.getAllCourses().subscribe({
      next:  c => this.allCourses.set(c),
      error: () => this.allCourses.set([]),
    });
    this.svc.GetSchools().subscribe({
      next:  s  => { this.schools.set(s); this.loadingSchools.set(false); },
      error: () => this.loadingSchools.set(false),
    });
  }

  // ── Load teachers ─────────────────────────────────────────────────────────
  loadTeachers(): void {
    this.loadingTeachers.set(true);
    this.svc.getAllTeachers().subscribe({
      next:  t  => { this.teachers.set(t);  this.loadingTeachers.set(false); },
      error: () => this.loadingTeachers.set(false),
    });
  }

  // ── Cascade: school → stages ──────────────────────────────────────────────
  onSchoolChange(schoolId: string): void {
    this.form.schoolId = schoolId;
    this.form.stageIds = [];
    this.form.yearIds  = [];
    this.years.set([]);

    if (!schoolId) { this.stages.set([]); return; }

    this.loadingStages.set(true);
    // Load all stages, then filter locally for the selected school
    this.svc.GetStages(schoolId).subscribe({
      next: s => {
        // Filter stages for this school (backend may return all stages)
        const filtered = s.filter(stage => stage.schoolId === schoolId);
        this.stages.set(filtered);
        this.loadingStages.set(false);
      },
      error: () => {
        this.stages.set([]);
        this.loadingStages.set(false);
      },
    });
  }

  // ── Cascade: stage multi-select → years ───────────────────────────────────
  onStageToggle(stageId: string, checked: boolean): void {
    if (checked) {
      this.form.stageIds = [...this.form.stageIds, stageId];
    } else {
      this.form.stageIds = this.form.stageIds.filter(id => id !== stageId);
      // remove years belonging to this stage
      const stageYearIds = new Set(
        (this.years().filter(y => y.stageId === stageId)).map(y => y.id)
      );
      this.form.yearIds = this.form.yearIds.filter(id => !stageYearIds.has(id));
    }
    this.loadYearsForStages();
  }

  private loadYearsForStages(): void {
    if (!this.form.stageIds.length) { this.years.set([]); return; }
    this.loadingYears.set(true);

    let pending = this.form.stageIds.length;
    const allYears: Year[] = [];

    for (const sid of this.form.stageIds) {
      this.svc.GetYears(sid).subscribe({
        next: ys => {
          // Filter years for this stage (backend may return all years)
          const filtered = (ys ?? []).filter(y => y.stageId === sid);
          allYears.push(...filtered.map(y => ({ ...y, stageId: y.stageId ?? sid })));
          pending--;
          if (pending === 0) {
            // deduplicate by id
            const seen = new Set<string>();
            this.years.set(allYears.filter(y => seen.has(y.id) ? false : (seen.add(y.id), true)));
            this.loadingYears.set(false);
          }
        },
        error: () => { pending--; if (pending === 0) this.loadingYears.set(false); },
      });
    }
  }

  onYearToggle(yearId: string, checked: boolean): void {
    if (checked) {
      this.form.yearIds = [...this.form.yearIds, yearId];
    } else {
      this.form.yearIds = this.form.yearIds.filter(id => id !== yearId);
    }
  }

  isStageChecked(id: string) { return this.form.stageIds.includes(id); }
  isYearChecked(id:  string) { return this.form.yearIds.includes(id); }

  // ── Add teacher ───────────────────────────────────────────────────────────
  submit(): void {
    if (!this.canSubmit()) return;
    this.addLoading.set(true);
    this.clearMessages();

    this.svc.addTeacher({
      name:        this.form.name,
      email:       this.form.email,
      phoneNumber: this.form.phoneNumber,
      userName:    this.form.userName || this.form.email,
      password:    this.form.password,
      schoolId:    this.form.schoolId,
      stageIds:    this.form.stageIds,
      yearIds:     this.form.yearIds,
    }).subscribe({
      next: () => {
        this.addLoading.set(false);
        this.successMsg.set(`Teacher "${this.form.name}" added successfully.`);
        this.form = this.blankForm();
        this.stages.set([]);
        this.years.set([]);
        this.showForm.set(false);
        this.loadTeachers();
      },
      error: err => {
        this.addLoading.set(false);
        this.errorMsg.set(err.error?.message || err.message || 'Failed to add teacher.');
      },
    });
  }

  // ── Remove teacher ────────────────────────────────────────────────────────
  remove(teacher: DashboardTeacher): void {
    if (!teacher.id || !confirm(`Remove "${teacher.name}"? This cannot be undone.`)) return;
    this.removeLoadingId.set(teacher.id);
    this.clearMessages();

    this.svc.removeTeacher(teacher.id).subscribe({
      next: () => {
        this.removeLoadingId.set(null);
        this.successMsg.set(`"${teacher.name}" removed.`);
        this.loadTeachers();
      },
      error: err => {
        this.removeLoadingId.set(null);
        this.errorMsg.set(err.error?.message || err.message || 'Failed to remove teacher.');
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  toggleForm(): void {
    this.showForm.update(v => !v);
    if (!this.showForm()) { this.form = this.blankForm(); this.stages.set([]); this.years.set([]); }
  }

  private blankForm(): TeacherForm {
    return { name: '', email: '', phoneNumber: '', userName: '', password: '', schoolId: '', stageIds: [], yearIds: [] };
  }

  private clearMessages(): void { this.successMsg.set(null); this.errorMsg.set(null); }
}
