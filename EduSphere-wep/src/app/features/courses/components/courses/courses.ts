import { Component, Input, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DashboardService } from "../../../dashboard";
import { ActivatedRoute, Router } from "@angular/router";
import { CoursesService } from "../../courses.service";
import { Course, CourseListItem } from "../../models";
import { StudentSelection } from "../../models";
import { signal } from '@angular/core';
import { Pagination } from "../../../../shared/components/pagination/pagination";
import { LoadingSpinner } from "../../../../shared/components/loading-spinner/loading-spinner";

@Component({
  imports: [CommonModule, Pagination, LoadingSpinner],
  selector: "app-courses",
  styleUrl: "./courses.css",
  templateUrl: "./courses.html",
})
export class Courses implements OnInit {
  private dashboardService = inject(DashboardService);
  private courseService = inject(CoursesService);
  private router = inject(Router);

  // @Input() schoolName = "";
  schoolName = signal<string>('');
  schoolImage: string | null = null;
  stageName = "";
  yearName = "";

  defaultSchoolImage =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           width="200"
           height="200"
           viewBox="0 0 200 200">

        <rect width="200" height="200" fill="#eef2ff"/>

        <circle
          cx="100"
          cy="80"
          r="30"
          fill="#c7d2fe"
        />

        <rect
          x="55"
          y="120"
          width="90"
          height="50"
          rx="8"
          fill="#c7d2fe"
        />

        <text
          x="100"
          y="185"
          font-family="Arial, sans-serif"
          font-size="12"
          fill="#6366f1"
          text-anchor="middle">
          No Image
        </text>

      </svg>
    `);

  private courseColors = [
    "#4f46e5",
    "#0ea5e9",
    "#16a34a",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#db2778",
  ];

  // ==========================
  // courses: CourseListItem[] = [];
  courses = signal<CourseListItem[]>([]);

  selectedSchoolId: string | null = null;
  selectedStageId: string | null = null;
  selectedYearId: string | null = null;

  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.selectedSchoolId = params.get("schoolId");
      this.selectedStageId = params.get("stageId");
      this.selectedYearId = params.get("yearId");

      if (
        !this.selectedSchoolId ||
        !this.selectedStageId ||
        !this.selectedYearId
      ) {
        this.router.navigate(["/home"]);
        return;
      }
      this.loadSelectionNames();
      this.loadCourses();
    });
  }

  // ==========================================
  // Load Names
  // ==========================================

  private loadSelectionNames(): void {
    this.dashboardService.GetSchools().subscribe({
      next: (schools) => {
        const school = schools.find((s) => s.id === this.selectedSchoolId);

        if (!school) {
          return;
        }

        // this.schoolName = school.name;
        this.schoolName.set(school.name);
        this.schoolImage = school.imageUrl || null;

        const stage = school.stages?.find((s) => s.id === this.selectedStageId);

        if (!stage) {
          return;
        }

        this.stageName = stage.name;

        const year = stage.years?.find((y) => y.id === this.selectedYearId);

        if (!year) {
          return;
        }

        this.yearName = year.name;

      },
      
      error: (err) => {
        console.error("Failed to load selection names:", err);
      },
    });
  }

  // ==========================================
  // Load Courses From API
  // ==========================================

   // Loading state for courses
  isLoadingCourses = signal<boolean>(false);

  // Paged courses for the current page
  pagedCourses = signal<CourseListItem[]>([]);
  currentPage = signal(1);


  private loadCourses(): void {
    if (!this.selectedYearId) {
      console.error("Year ID is missing. Courses cannot be loaded.");
      return;
    }
     this.isLoadingCourses.set(true);
    if (!this.selectedSchoolId || !this.selectedStageId) {
      console.error(
        "School ID or Stage ID is missing. Courses cannot be loaded.",
      );
      return;
    }

    this.courseService
      .getCourses(
        this.selectedSchoolId,
        this.selectedStageId,
        this.selectedYearId,
      )
      .subscribe({
        next: (courses) => {
          // this.courses = courses;
          this.courses.set(courses);
          //  this.isLoadingCourses.set(false);
        },
        error: (err) => {
          console.error("Failed to load courses:", err);
          this.isLoadingCourses.set(false);
        },
        complete: () => {
          this.isLoadingCourses.set(false); 
        },
      });
  }

  // ==========================================
  // Pagination
  // ==========================================
  onPagedCourses(items: CourseListItem[]): void {
    this.pagedCourses.set(items);
  }

  // ==========================================
  // Course Image
  // ==========================================

  private buildPlaceholderImage(name: string, index: number): string {
    const color = this.courseColors[index % this.courseColors.length];

    const safeName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="400"
           height="250"
           viewBox="0 0 400 250">

        <rect
          width="400"
          height="250"
          fill="${color}"
        />

        <text
          x="200"
          y="130"
          font-family="Arial, sans-serif"
          font-size="20"
          fill="#ffffff"
          text-anchor="middle"
          font-weight="bold">

          ${safeName}

        </text>

      </svg>
    `;

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  // ==========================================
  // Image Errors
  // ==========================================

  onSchoolImageError(event: Event): void {
    const img = event.target as HTMLImageElement;

    if (img.src !== this.defaultSchoolImage) {
      img.src = this.defaultSchoolImage;
    }
  }

  onCourseImageError(event: Event): void {
    const img = event.target as HTMLImageElement;

    if (img.src !== this.defaultSchoolImage) {
      img.src = this.defaultSchoolImage;
    }
  }



  // ==========================================
  // Course Click (Navigate to course details)
  // ==========================================

  onCourseClick(course: CourseListItem): void {
    this.router.navigate(["/course", course.id]);
  }

  // // ==========================================
  // // Authentication
  // // ==========================================


  // isLoggedIn(): boolean {
  //   const token =
  //     localStorage.getItem("token") ?? sessionStorage.getItem("token");

  //   return Boolean(token);
  // }

  // // ==========================================
  // // Course Access
  // // ==========================================

  // hasAccess(course: CourseListItem): boolean {
  //   return this.isLoggedIn() && course.isPaid;
  // }

  // getButtonLabel(course: CourseListItem): string {
  //   return this.hasAccess(course) ? "Continue" : "Pay Now";
  // }

  // // ==========================================
  // // Course Button
  // // ==========================================

  // onCourseButtonClick(course: Course): void {
  //   if (this.hasAccess(course)) {
  //     // TODO: navigate into the course content once that route exists
  //     alert(`Continuing course: ${course.title}`);
  //     this.router.navigate(["/courcourse", course.id]);
  //     return;
  //   }

  //   if (!this.isLoggedIn()) {
  //     // TODO: redirect to /auth/login (optionally with a returnUrl back to this course)
  //     alert("Please log in first to purchase this course.");
  //     return;
  //   }

  //   // TODO: redirect to the actual payment/checkout flow once it's connected
  //   alert(`Redirecting to payment for: ${course.title} (${course.price})`);
  // }
}
