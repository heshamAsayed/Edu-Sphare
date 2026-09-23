import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../dashboard.service';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { School, Stage, Year } from '../../models';

type StructureTab = 'schools' | 'stages' | 'years';

@Component({
  selector: 'app-site-structure-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinner],
  templateUrl: './site-structure-tab.html',
  styleUrl:    './site-structure-tab.css',
})
export class SiteStructureTab implements OnInit {
  private svc = inject(DashboardService);

  // ── Sub-tab ───────────────────────────────────────────────────────────────
  activeSection = signal<StructureTab>('schools');

  // ── Data ──────────────────────────────────────────────────────────────────
  schools = signal<School[]>([]);

  loadingSchools = signal(true);
  loadingYears   = signal(false);

  // Cascade: selected school → its stages; selected stage → its years
  selectedSchoolId = signal('');
  selectedStageId  = signal('');

  // Derived from the selected school's nested stages/years (no extra API call)
  get filteredStages(): Stage[] {
    const school = this.schools().find(s => s.id === this.selectedSchoolId());
    return school?.stages ?? [];
  }

  get filteredYears(): Year[] {
    const stage = this.filteredStages.find(s => s.id === this.selectedStageId());
    return stage?.years ?? [];
  }

  // ── Forms ─────────────────────────────────────────────────────────────────
  newSchoolName  = '';
  newSchoolImage: File | null = null;
  newStageName   = '';
  newStageOrder  = 1;
  newYearName    = '';
  newYearOrder   = 1;

  saving   = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadSchools();
  }

  // ── Load schools ──────────────────────────────────────────────────────────
  loadSchools(): void {
    this.loadingSchools.set(true);
    this.svc.GetSchools().subscribe({
      next:  s  => { this.schools.set(s); this.loadingSchools.set(false); },
      error: () => this.loadingSchools.set(false),
    });
  }

  // ── Load stages for selected school ──────────────────────────────────────
  onSchoolSelect(id: string): void {
    this.selectedSchoolId.set(id);
    this.selectedStageId.set('');
  }

  // ── Load years for selected stage ─────────────────────────────────────────
  onStageSelect(id: string): void {
    this.selectedStageId.set(id);
  }

  // ── Image picker ──────────────────────────────────────────────────────────
  onImagePick(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.newSchoolImage = file;
  }

  // ── Add School ────────────────────────────────────────────────────────────
  addSchool(): void {
    if (!this.newSchoolName.trim()) return;
    this.saving.set(true); this.clearMessages();
    this.svc.addSchool({ name: this.newSchoolName.trim() }, this.newSchoolImage ?? undefined).subscribe({
      next: s => {
        this.saving.set(false);
        this.successMsg.set(`School "${s.name}" added.`);
        this.newSchoolName  = '';
        this.newSchoolImage = null;
        this.loadSchools();
      },
      error: err => { this.saving.set(false); this.errorMsg.set(err.error?.message || err.message); },
    });
  }

  // ── Add Stage ─────────────────────────────────────────────────────────────
  addStage(): void {
    if (!this.newStageName.trim() || !this.selectedSchoolId()) return;
    this.saving.set(true); this.clearMessages();
    this.svc.addStage({ name: this.newStageName.trim(), orderNo: this.newStageOrder, schoolId: this.selectedSchoolId() }).subscribe({
      next: s => {
        this.saving.set(false);
        this.successMsg.set(`Stage "${s.name}" added.`);
        this.newStageName = '';
        this.newStageOrder = 1;
        const currentSchoolId = this.selectedSchoolId();
        this.loadingSchools.set(true);
        this.svc.GetSchools().subscribe({
          next: schools => {
            this.schools.set(schools);
            this.selectedSchoolId.set(currentSchoolId);
            this.loadingSchools.set(false);
          },
          error: () => this.loadingSchools.set(false),
        });
      },
      error: err => { this.saving.set(false); this.errorMsg.set(err.error?.message || err.message); },
    });
  }

  // ── Add Year ──────────────────────────────────────────────────────────────
  addYear(): void {
    if (!this.newYearName.trim() || !this.selectedStageId()) return;
    this.saving.set(true); this.clearMessages();
    this.svc.addYear({ name: this.newYearName.trim(), orderNo: this.newYearOrder, stageId: this.selectedStageId() }).subscribe({
      next: y => {
        this.saving.set(false);
        this.successMsg.set(`Year "${y.name}" added.`);
        this.newYearName = '';
        this.newYearOrder = 1;
        const currentSchoolId = this.selectedSchoolId();
        const currentStageId  = this.selectedStageId();
        this.loadingSchools.set(true);
        this.svc.GetSchools().subscribe({
          next: schools => {
            this.schools.set(schools);
            this.selectedSchoolId.set(currentSchoolId);
            this.selectedStageId.set(currentStageId);
            this.loadingSchools.set(false);
          },
          error: () => this.loadingSchools.set(false),
        });
      },
      error: err => { this.saving.set(false); this.errorMsg.set(err.error?.message || err.message); },
    });
  }

  private clearMessages(): void { this.successMsg.set(null); this.errorMsg.set(null); }
}
