import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-assessment-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assessment-sidebar.html',
  styleUrl: './assessment-sidebar.css',
})
export class AssessmentSidebar {
  progressPercent = input<number>(60);
}
