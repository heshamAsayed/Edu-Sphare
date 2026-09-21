import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { School, Stage, Year } from '../../../dashboard/models/index';
import { DashboardService } from '../../../dashboard';
import { Router } from '@angular/router';

type ViewType = 'schools' | 'stages' | 'years';

@Component({
  imports: [CommonModule],
  selector: 'app-schools-section',
  styleUrl: './schools-section.css',
  templateUrl: './schools-section.html',
})
export class SchoolsSection implements OnInit {

  private schoolService = inject(DashboardService);
  private router = inject(Router);

  schools = signal<School[]>([]);

  // ================== Current State ==================

  currentView: ViewType = 'schools';

  selectedSchool: School | null = null;
  selectedStage: Stage | null = null;

  // ================== LocalStorage Key ==================

  private readonly selectionKey = 'studentSelection';

  // ================== Icons ==================

  private iconsPool: string[] = [
    'fa-book',
    'fa-university',
    'fa-child',
    'fa-graduation-cap',
    'fa-pencil',
    'fa-flask',
    'fa-calculator',
    'fa-globe',
    'fa-language',
    'fa-music',
    'fa-paint-brush',
    'fa-heartbeat',
    'fa-laptop',
    'fa-search',
    'fa-map',
    'fa-lightbulb-o',
    'fa-star'
  ];

  // ================== Colors ==================

  private avatarColors: string[] = [
    '#4f46e5',
    '#0ea5e9',
    '#16a34a',
    '#d97706',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
    '#db2777'
  ];

  // ================== Init ==================

  ngOnInit(): void {

    this.schoolService.GetSchools().subscribe({

      next: (schools) => {
        this.schools.set(schools);
      },

      error: (err) => {

        console.error('GetSchools() failed:', err);
      }

    });
  }

  // ================== Helpers ==================

  getStageIcon(stage: Stage, index: number): string {

    return this.iconsPool[
      index % this.iconsPool.length
    ];
  }

  getSchoolInitial(school: School): string {

    return school.name
      ?.trim()
      ?.charAt(0) ?? '?';
  }

  getSchoolColor(index: number): string {

    return this.avatarColors[
      index % this.avatarColors.length
    ];
  }

  getSortedStages(school: School): Stage[] {

    return [...school.stages]
      .sort(
        (a, b) =>
          (a.orderNo ?? 0) -
          (b.orderNo ?? 0)
      );
  }

  getSortedYears(stage: Stage): Year[] {

    return [...stage.years]
      .sort(
        (a, b) =>
          (a.orderNo ?? 0) -
          (b.orderNo ?? 0)
      );
  }

  // ================== Navigation ==================

  selectSchool(school: School): void {

    this.selectedSchool = school;

    this.selectedStage = null;

    this.currentView = 'stages';
  }

  selectStage(stage: Stage): void {

    this.selectedStage = stage;

    this.currentView = 'years';
  }

  selectYear(year: Year): void {

    if (!this.selectedSchool || !this.selectedStage) {

      console.error(
        'School or Stage is not selected'
      );

      return;
    }

    const selection = {

      schoolId: this.selectedSchool.id,

      stageId: this.selectedStage.id,

      yearId: year.id

    };

    localStorage.setItem(
      this.selectionKey,
      JSON.stringify(selection)
    );

    // alert("navigate to courses page");
     this.router.navigate([
      '/courses',
      this.selectedSchool.id,
      this.selectedStage.id,
      year.id
    ]);
    // alert("navigated to courses page");

  }

  // ================== Breadcrumb Navigation ==================

  goToSchools(): void {

    this.currentView = 'schools';

    this.selectedSchool = null;

    this.selectedStage = null;
  }

  goToStages(): void {

    this.currentView = 'stages';

    this.selectedStage = null;
  }

}
