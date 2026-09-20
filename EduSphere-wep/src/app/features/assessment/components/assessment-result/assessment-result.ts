import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-assessment-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assessment-result.html',
  styleUrl: './assessment-result.css',
})
export class AssessmentResult {
  score = input.required<number>();
  total = input.required<number>();
  percentage = input.required<number>();

  retake = output<void>();
}
