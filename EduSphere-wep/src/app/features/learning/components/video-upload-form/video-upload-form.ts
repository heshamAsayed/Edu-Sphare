import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-video-upload-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-upload-form.html',
  styleUrl: './video-upload-form.css',
})
export class VideoUploadForm {
  courseId = input<string>('');
  defaultOrder = input<number>(0);
  isUploading = input<boolean>(false);
  uploadProgress = input<number>(0);
  progressBytes = input<string>('');
  uploadStatusMessage = input<{ text: string; isError: boolean } | null>(null);

  uploadSubmit = output<FormData>();

  title = '';
  description = '';
  sortOrder = 0;
  availabilityDays = 1;
  selectedVideoFile: File | null = null;
  selectedAttachments: File[] = [];

  onVideoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedVideoFile = input.files[0];
      if (!this.title) {
        this.title = this.selectedVideoFile.name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  onAttachmentsChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedAttachments = Array.from(input.files);
    }
  }

  onSubmit(): void {
    if (!this.selectedVideoFile) {
      alert('Please select a video file first.');
      return;
    }

    const formData = new FormData();
    formData.append('CourseId', this.courseId());
    formData.append('Title', this.title.trim());
    formData.append('Description', this.description.trim());
    formData.append('SortOrder', String(this.sortOrder || this.defaultOrder()));
    formData.append('AvailabilityDays', String(this.availabilityDays || 1));
    formData.append('VideoFile', this.selectedVideoFile);

    this.selectedAttachments.forEach((att) => {
      formData.append('Attachments', att);
    });

    this.uploadSubmit.emit(formData);
  }

  resetForm(): void {
    this.title = '';
    this.description = '';
    this.sortOrder = this.defaultOrder();
    this.availabilityDays = 1;
    this.selectedVideoFile = null;
    this.selectedAttachments = [];
  }
}
