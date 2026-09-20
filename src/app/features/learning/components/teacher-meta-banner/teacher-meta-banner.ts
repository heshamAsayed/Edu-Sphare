import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherStage } from '../../models';

@Component({
  selector: 'app-teacher-meta-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-meta-banner.html',
  styleUrl: './teacher-meta-banner.css',
})
export class TeacherMetaBanner {
  schoolName = input<string | null>(null);
  stages = input<TeacherStage[]>([]);

  stagesText = computed(() => {
    return this.stages().map((s) => s.name).join(', ');
  });
}
