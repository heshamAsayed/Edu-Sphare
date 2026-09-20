import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lesson-transcription',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-transcription.html',
  styleUrl: './lesson-transcription.css',
})
export class LessonTranscription {
  transcriptionText = input<string | null>(null);
  isLoading = input<boolean>(false);

  currentTab = signal<'transcription' | 'info'>('transcription');

  setTab(tab: 'transcription' | 'info'): void {
    this.currentTab.set(tab);
  }
}
