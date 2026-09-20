import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonVideo } from '../../models';

@Component({
  selector: 'app-lesson-playlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-playlist.html',
  styleUrl: './lesson-playlist.css',
})
export class LessonPlaylist {
  videos = input<LessonVideo[]>([]);
  activeVideo = input<LessonVideo | null>(null);

  selectVideo = output<LessonVideo>();

  watchedCount = computed(() => {
    return this.videos().filter((v) => v.isWatched).length;
  });

  progressPercent = computed(() => {
    const total = this.videos().length;
    if (total === 0) return 0;
    return Math.round((this.watchedCount() / total) * 100);
  });

  onSelectVideo(video: LessonVideo): void {
    this.selectVideo.emit(video);
  }

  formatDuration(duration?: number): string {
    if (!duration) return 'Video Lesson';
    return `${Math.round(duration / 60)} min`;
  }
}
