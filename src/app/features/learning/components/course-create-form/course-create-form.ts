import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateCourseRequest, TeacherStage, TeacherYear } from '../../models';

@Component({
  selector: 'app-course-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-create-form.html',
  styleUrl: './course-create-form.css',
})
export class CourseCreateForm {
  stages = input<TeacherStage[]>([]);
  teacherSchoolName = input<string>('');
  isCreating = input<boolean>(false);

  formSubmit = output<CreateCourseRequest>();
  courseDataChange = output<CreateCourseRequest>();

  name = signal<string>('');
  price = signal<number>(0);
  selectedStageId = signal<string>('');
  selectedYearId = signal<string>('');

  availableYears = computed<TeacherYear[]>(() => {
    const stageId = this.selectedStageId();
    if (!stageId) return [];
    const stage = this.stages().find((s) => s.id === stageId);
    return stage?.years || [];
  });

  onNameChange(val: string): void {
    this.name.set(val);
    this.emitChange();
  }

  onPriceChange(val: number): void {
    this.price.set(val);
    this.emitChange();
  }

  onStageChange(stageId: string): void {
    this.selectedStageId.set(stageId);
    this.selectedYearId.set('');
    this.emitChange();
  }

  onYearChange(yearId: string): void {
    this.selectedYearId.set(yearId);
    this.emitChange();
  }

  private emitChange(): void {
    this.courseDataChange.emit({
      name: this.name().trim(),
      price: this.price() || 0,
      stageId: this.selectedStageId(),
      yearId: this.selectedYearId(),
    });
  }

  onSubmit(): void {
    if (!this.name().trim()) {
      alert('Please enter the course name.');
      return;
    }
    if (!this.selectedStageId() || !this.selectedYearId()) {
      alert('Please select both the educational stage and academic year.');
      return;
    }

    this.formSubmit.emit({
      name: this.name().trim(),
      price: this.price() || 0,
      stageId: this.selectedStageId(),
      yearId: this.selectedYearId(),
    });
  }
}
