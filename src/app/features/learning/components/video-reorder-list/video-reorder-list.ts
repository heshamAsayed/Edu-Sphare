import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LessonVideo } from '../../models';

@Component({
  selector: 'app-video-reorder-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-reorder-list.html',
  styleUrl: './video-reorder-list.css',
})
export class VideoReorderList {
  videos = input<LessonVideo[]>([]);
  transcriptionStatuses = input<Record<string, { status: string; label: string }>>({});

  saveOrder = output<{ videoId: string; newOrder: number }>();

  // local editable sort orders
  orderValues: Record<string, number> = {};

  getOrder(vid: LessonVideo): number {
    if (this.orderValues[vid.id] !== undefined) {
      return this.orderValues[vid.id];
    }
    return vid.sortOrder ?? 0;
  }

  setOrder(vidId: string, val: number): void {
    this.orderValues[vidId] = val;
  }

  onSave(vid: LessonVideo): void {
    const newOrder = this.getOrder(vid);
    this.saveOrder.emit({ videoId: vid.id, newOrder });
  }
}
