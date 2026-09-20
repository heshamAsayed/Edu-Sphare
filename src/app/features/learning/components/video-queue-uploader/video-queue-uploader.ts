import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoQueueItem } from '../../models';

@Component({
  selector: 'app-video-queue-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-queue-uploader.html',
  styleUrl: './video-queue-uploader.css',
})
export class VideoQueueUploader {
  queue = input<VideoQueueItem[]>([]);
  isUploading = input<boolean>(false);
  uploadProgress = input<number>(0);
  currentUploadInfo = input<string>('');

  filesAdded = output<File[]>();
  itemRemoved = output<number>();
  itemTitleChanged = output<{ index: number; title: string }>();
  itemOrderChanged = output<{ index: number; order: number }>();
  itemAttachmentsChanged = output<{ index: number; attachments: File[] }>();
  startUpload = output<void>();

  onAttachmentsChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const current = this.queue()[index]?.attachments || [];
      const newFiles = Array.from(input.files);
      this.itemAttachmentsChanged.emit({ index, attachments: [...current, ...newFiles] });
      input.value = '';
    }
  }

  removeAttachment(itemIndex: number, attachIndex: number): void {
    const current = [...(this.queue()[itemIndex]?.attachments || [])];
    current.splice(attachIndex, 1);
    this.itemAttachmentsChanged.emit({ index: itemIndex, attachments: current });
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.filesAdded.emit(Array.from(input.files));
      input.value = '';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.filesAdded.emit(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  getFileSizeMB(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  onTitleInput(index: number, newTitle: string): void {
    this.itemTitleChanged.emit({ index, title: newTitle });
  }

  onOrderInput(index: number, newOrder: number): void {
    this.itemOrderChanged.emit({ index, order: newOrder });
  }

  onRemove(index: number): void {
    this.itemRemoved.emit(index);
  }

  onStartUpload(): void {
    this.startUpload.emit();
  }
}
