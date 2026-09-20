import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-restricted-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './restricted-card.html',
  styleUrl: './restricted-card.css',
})
export class RestrictedCard {
  courseId = input<string | null>(null);
  message = input<string | null>(null);
  dashboardLink = input<string>('/profile/me');

  displayMessage = computed(() => {
    if (this.message()) return this.message();
    const cId = this.courseId();
    if (cId) {
      return `This course (ID: ${cId}) is restricted to enrolled students or the course instructor. Please ensure you are logged in and enrolled.`;
    }
    return 'You need to be logged in with an active enrollment to access this course, or logged in as the course instructor.';
  });
}
