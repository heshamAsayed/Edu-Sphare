import {
  Component, inject, OnInit, signal, computed, HostListener, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../dashboard.service';
import { AccountService } from '../../../account/services/account.service';
import { AccountSummary } from '../../../account/models';
import { CoursesService } from '../../../courses/courses.service';
import { CourseListItem } from '../../../courses/models';
import { School, DashboardTeacher } from '../../models';
import { StageYearCountPipe } from '../../pipes/stage-year-count.pipe';

// ── Pie-chart slice ───────────────────────────────────────────────────────────
interface PieSlice {
  schoolId:   string;
  schoolName: string;
  students:   number;
  stages:     number;
  years:      number;
  color:      string;
  startAngle: number;
  endAngle:   number;
  path:       string;
  labelX:     number;
  labelY:     number;
}

const SLICE_COLORS = [
  '#76d936', '#444955', '#a3e635', '#2d9cdb', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, StageYearCountPipe],
  templateUrl: './overview-tab.html',
  styleUrl:    './overview-tab.css',
})
export class OverviewTab implements OnInit {
  private svc = inject(DashboardService);
  private coursesService = inject(CoursesService);
  private accountService = inject(AccountService);
  private el  = inject(ElementRef);

  // ── raw data ────────────────────────────────────────────────────────────
  schools  = signal<School[]>([]);
  teachers = signal<DashboardTeacher[]>([]);
  allCourses = signal<CourseListItem[]>([]);
  students = signal<AccountSummary[]>([]);

  loadingSchools  = signal(true);
  loadingTeachers = signal(true);

  // ── pie tooltip ─────────────────────────────────────────────────────────
  hoveredSlice = signal<PieSlice | null>(null);
  tooltipX     = signal(0);
  tooltipY     = signal(0);

  // ── computed stats ───────────────────────────────────────────────────────
  totalTeachers = computed(() => this.teachers().length);

  totalCourses = computed(() => this.allCourses().length);

  totalStudents = computed(() => this.students().length);

  totalSchools = computed(() => this.schools().length);

  // ── pie slices ───────────────────────────────────────────────────────────
  pieSlices = computed<PieSlice[]>(() => {
    const schools = this.schools();
    if (!schools.length) return [];

    // Count students per school from actual students array (by SchoolId)
    const studentsPerSchool: Record<string, number> = {};
    for (const student of this.students()) {
      const sid = (student as any).schoolId;
      if (sid) {
        studentsPerSchool[sid] = (studentsPerSchool[sid] ?? 0) + 1;
      }
    }

    const entries = schools.map((s, i) => ({
      school:   s,
      students: studentsPerSchool[s.id] ?? 0,
      color:    SLICE_COLORS[i % SLICE_COLORS.length],
    }));

    const total = entries.reduce((sum, e) => sum + e.students, 0) || 1;
    const R = 90, CX = 110, CY = 110;

    const slices: PieSlice[] = [];
    let angle = -Math.PI / 2;

    for (const entry of entries) {
      const sweep = (entry.students / total) * 2 * Math.PI;
      const endAngle = angle + sweep;

      const x1 = CX + R * Math.cos(angle);
      const y1 = CY + R * Math.sin(angle);
      const x2 = CX + R * Math.cos(endAngle);
      const y2 = CY + R * Math.sin(endAngle);
      const large = sweep > Math.PI ? 1 : 0;

      const mid = angle + sweep / 2;
      const LR  = R * 0.65;

      slices.push({
        schoolId:   entry.school.id,
        schoolName: entry.school.name,
        students:   entry.students,
        stages:     entry.school.stages?.length ?? 0,
        years:      entry.school.stages?.reduce((s, st) => s + (st.years?.length ?? 0), 0) ?? 0,
        color:      entry.color,
        startAngle: angle,
        endAngle,
        path:       `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
        labelX:     CX + LR * Math.cos(mid),
        labelY:     CY + LR * Math.sin(mid),
      });

      angle = endAngle;
    }
    return slices;
  });

  // ── lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.svc.GetSchools().subscribe({
      next:  s  => { this.schools.set(s);  this.loadingSchools.set(false); },
      error: () => this.loadingSchools.set(false),
    });

    this.coursesService.getAllCourses().subscribe({
      next: courses => this.allCourses.set(courses),
      error: () => this.allCourses.set([]),
    });

    this.accountService.getAllStudents().subscribe({
      next: students => this.students.set(students || []),
      error: () => this.students.set([]),
    });

    this.svc.getAllTeachers().subscribe({
      next:  t  => { this.teachers.set(t);  this.loadingTeachers.set(false); },
      error: () => this.loadingTeachers.set(false),
    });
  }

  // ── pie interaction ──────────────────────────────────────────────────────
  onSliceEnter(slice: PieSlice, event: MouseEvent): void {
    this.hoveredSlice.set(slice);
    this.moveTooltip(event);
  }

  onSliceMove(event: MouseEvent): void { this.moveTooltip(event); }

  onSliceLeave(): void { this.hoveredSlice.set(null); }

  private moveTooltip(ev: MouseEvent): void {
    const rect = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
    this.tooltipX.set(ev.clientX - rect.left + 14);
    this.tooltipY.set(ev.clientY - rect.top  - 10);
  }

  @HostListener('mousemove', ['$event'])
  onHostMove(ev: MouseEvent): void { if (this.hoveredSlice()) this.moveTooltip(ev); }

  pct(students: number): string {
    const total = this.pieSlices().reduce((s, p) => s + p.students, 0);
    return total ? ((students / total) * 100).toFixed(1) + '%' : '0%';
  }
}
