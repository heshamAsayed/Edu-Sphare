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
  imageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  imageError = signal<string | null>(null);

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

  onImagePick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageError.set(null);

    if (!file) {
      this.clearImage();
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.imageError.set('Course image must be JPG, PNG, or WebP.');
      this.clearImage();
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.imageError.set('Course image must be 2 MB or smaller.');
      this.clearImage();
      input.value = '';
      return;
    }

    this.imageFile.set(file);
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
    this.emitChange();
  }

  clearImage(): void {
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imagePreviewUrl.set(null);
    this.imageFile.set(null);
    this.emitChange();
  }

  private buildPayload(): CreateCourseRequest {
    return {
      name: this.name().trim(),
      price: this.price() || 0,
      stageId: this.selectedStageId(),
      yearId: this.selectedYearId(),
      image: this.imageFile(),
    };
  }

  private emitChange(): void {
    this.courseDataChange.emit(this.buildPayload());
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

    this.formSubmit.emit(this.buildPayload());
  }
}
