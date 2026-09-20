import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Navbar } from "../../../features/home/components/navbar/navbar";
import { CourseDetails } from "../../../features/courses/components/course-details/course-details";
import { Footer } from "../../../features/home/components/footer/footer";
import { LoadingSpinner } from "../../../shared/components/loading-spinner/loading-spinner";

@Component({
  imports: [Navbar, CourseDetails, Footer, LoadingSpinner],
  selector: 'app-course-details-page',
  styleUrl: './course-details-page.css',
  templateUrl: './course-details-page.html',
})
export class CourseDetailsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  courseId = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('courseId');

      if (!id) {
        this.router.navigate(['/home']);
        return;
      }

      this.courseId.set(id);
    });
  }
}