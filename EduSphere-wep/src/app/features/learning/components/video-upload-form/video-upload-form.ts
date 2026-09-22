import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoQueueItem } from '../../models';

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
  currentUploadInfo = input<string>('');
  uploadStatusMessage = input<{ text: string; isError: boolean } | null>(null);

  uploadBatchSubmit = output<VideoQueueItem[]>();

  queue = signal<VideoQueueItem[]>([]);

  // Duplicate orders detection
  duplicateOrders = computed<number[]>(() => {
    const counts = new Map<number, number>();
    this.queue().forEach((item) => {
      const order = Number(item.sortOrder);
      if (!isNaN(order)) {
        counts.set(order, (counts.get(order) || 0) + 1);
      }
    });
    const dupes: number[] = [];
    counts.forEach((count, order) => {
      if (count > 1) {
        dupes.push(order);
      }
    });
    return dupes;
  });

  hasDuplicateOrders = computed<boolean>(() => {
    return this.duplicateOrders().length > 0;
  });

  hasInvalidOrders = computed<boolean>(() => {
    return this.queue().some((item) => {
      const o = Number(item.sortOrder);
      return isNaN(o) || o < 1;
    });
  });

  hasMissingTitles = computed<boolean>(() => {
    return this.queue().some((item) => !item.title || !item.title.trim());
  });

  isFormValid = computed<boolean>(() => {
    if (this.queue().length === 0) return false;
    if (this.hasDuplicateOrders()) return false;
    if (this.hasInvalidOrders()) return false;
    if (this.hasMissingTitles()) return false;
    return true;
  });

  isOrderDuplicate(order: number): boolean {
    return this.duplicateOrders().includes(Number(order));
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  addFiles(files: File[]): void {
    const current = [...this.queue()];
    const baseOrder = Math.max(1, (this.defaultOrder() || 0) + 1);

    let nextOrder =
      current.length > 0
        ? Math.max(...current.map((c) => Number(c.sortOrder) || 0)) + 1
        : baseOrder;

    files.forEach((file) => {
      if (!current.some((c) => c.file.name === file.name && c.file.size === file.size)) {
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
        current.push({
          file,
          title: cleanTitle,
          sortOrder: nextOrder,
          description: '',
          availabilityDays: 1,
          attachments: [],
        });
        nextOrder++;
      }
    });

    this.queue.set(current);
  }

  removeVideo(index: number): void {
    const current = [...this.queue()];
    current.splice(index, 1);
    this.queue.set(current);
  }

  clearQueue(): void {
    this.queue.set([]);
  }

  updateTitle(index: number, title: string): void {
    const current = [...this.queue()];
    if (current[index]) {
      current[index].title = title;
      this.queue.set(current);
    }
  }

  updateOrder(index: number, order: number): void {
    const current = [...this.queue()];
    if (current[index]) {
      current[index].sortOrder = Number(order);
      this.queue.set(current);
    }
  }

  updateDescription(index: number, desc: string): void {
    const current = [...this.queue()];
    if (current[index]) {
      current[index].description = desc;
      this.queue.set(current);
    }
  }

  updateAvailability(index: number, days: number): void {
    const current = [...this.queue()];
    if (current[index]) {
      current[index].availabilityDays = Math.max(1, Number(days) || 1);
      this.queue.set(current);
    }
  }

  onAttachmentsChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const current = [...this.queue()];
      if (current[index]) {
        const existingAtt = current[index].attachments || [];
        current[index].attachments = [...existingAtt, ...Array.from(input.files)];
        this.queue.set(current);
      }
      input.value = '';
    }
  }

  removeAttachment(videoIndex: number, attIndex: number): void {
    const current = [...this.queue()];
    if (current[videoIndex] && current[videoIndex].attachments) {
      current[videoIndex].attachments!.splice(attIndex, 1);
      this.queue.set(current);
    }
  }

  getFileSizeMB(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      if (this.hasDuplicateOrders()) {
        alert('Upload blocked: Duplicate order numbers detected. Each lesson must have a unique order.');
      } else if (this.hasInvalidOrders()) {
        alert('Lesson order must be at least 1 for all videos.');
      } else if (this.hasMissingTitles()) {
        alert('Please enter a title for every lesson before uploading.');
      }
      return;
    }

    this.uploadBatchSubmit.emit(this.queue());
  }
}

