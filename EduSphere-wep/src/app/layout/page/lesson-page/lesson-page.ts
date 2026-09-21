import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountService } from '../../../features/account/services/account.service';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { AttentionQuestionService } from '../../../features/attention-question/attention-question.service';
import { AttentionQuestion } from '../../../features/attention-question/models';
import {
  AttentionModal,
  CourseSummary,
  LearningService,
  LessonPlayer,
  LessonPlaylist,
  LessonResponse,
  LessonTranscription,
  LessonVideo,
} from '../../../features/learning';

@Component({
  selector: 'app-lesson-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LoadingSpinner,
    LessonPlayer,
    LessonPlaylist,
    LessonTranscription,
    AttentionModal,
  ],
  templateUrl: './lesson-page.html',
  styleUrl: './lesson-page.css',
})
export class LessonPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private learningService = inject(LearningService);
  private accountService = inject(AccountService);
  private attentionQuestionService = inject(AttentionQuestionService);

  courseId = signal<string | null>(null);
  course = signal<CourseSummary | null>(null);
  videos = signal<LessonVideo[]>([]);
  activeVideo = signal<LessonVideo | null>(null);

  courseName = computed(() => this.course()?.name || this.course()?.title || 'Course');
  schoolName = computed(() => this.course()?.schoolName || this.accountService.currentUser()?.schoolName || 'School');
  stageName = computed(() => this.course()?.stageName || this.accountService.currentUser()?.stageName || 'Stage');
  yearName = computed(() => this.course()?.yearName || this.accountService.currentUser()?.yearName || 'Year');

  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  transcriptionText = signal<string | null>(null);
  isLoadingTranscription = signal<boolean>(false);

  // Attention Check states
  isAttentionModalOpen = signal<boolean>(false);
  currentAttentionQuestion = signal<AttentionQuestion | null>(null);
  isGeneratingQuestion = signal<boolean>(false);

  private attentionTriggers: number[] = [];
  private handledTriggers = new Set<number>();
  private videoDuration = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('courseId') || this.route.snapshot.queryParamMap.get('courseId') || '1';
      this.courseId.set(id);
      this.loadLesson(id);
    });
  }

  loadLesson(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.resetAttentionTriggers();

    this.learningService.getLesson(id).subscribe({
      next: (res: LessonResponse) => {
        this.course.set(res.course);
        const vids = res.videos || [];
        this.videos.set(vids);
        const initialActive = res.activeVideo || (vids.length > 0 ? vids[0] : null);
        this.activeVideo.set(initialActive);
        this.isLoading.set(false);

        if (initialActive) {
          this.loadTranscription(initialActive.id);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/restricted'], { queryParams: { courseId: id } });
          return;
        }
        this.errorMessage.set(err.message || 'Unable to load lesson data.');
      },
    });
  }

  selectVideo(video: LessonVideo): void {
    this.activeVideo.set(video);
    this.resetAttentionTriggers();
    this.loadTranscription(video.id);
  }

  loadTranscription(videoId: string): void {
    this.isLoadingTranscription.set(true);
    this.transcriptionText.set(null);

    this.learningService.getTranscription(videoId).subscribe({
      next: (text) => {
        this.transcriptionText.set(text);
        this.isLoadingTranscription.set(false);
      },
      error: () => {
        this.transcriptionText.set(null);
        this.isLoadingTranscription.set(false);
      },
    });
  }

  onMarkWatched(video: LessonVideo): void {
    const cId = this.courseId() || undefined;
    this.learningService.markVideoWatched({ courseId: cId, videoId: video.id }).subscribe({
      next: () => {
        const updatedList = this.videos().map((v) =>
          v.id === video.id ? { ...v, isWatched: true } : v
        );
        this.videos.set(updatedList);
        if (this.activeVideo()?.id === video.id) {
          this.activeVideo.set({ ...video, isWatched: true });
        }
      },
      error: (e) => console.error('Failed to mark watched:', e),
    });
  }

  // ==========================================
  // Playback-Synced Attention Check Logic
  // ==========================================

  onTimeUpdate(event: { currentTime: number; duration: number }): void {
    const { currentTime, duration } = event;
    if (!duration || duration <= 0) return;

    // 1. Setup random trigger points once duration is known
    if (this.attentionTriggers.length === 0 || this.videoDuration !== duration) {
      this.videoDuration = duration;
      this.setupAttentionTriggers(duration);
    }

    // 2. Check if current time crossed any unhandled trigger
    for (const trigger of this.attentionTriggers) {
      if (currentTime >= trigger && !this.handledTriggers.has(trigger)) {
        this.handledTriggers.add(trigger);
        this.triggerAttentionCheck();
        break;
      }
    }
  }

  private setupAttentionTriggers(duration: number): void {
    this.attentionTriggers = [];
    this.handledTriggers.clear();

    // <= 10 mins: 1 question | 10 to 30 mins: 2 questions | > 30 mins: 3 questions
    let count = 1;
    if (duration <= 600) {
      count = 1;
    } else if (duration <= 1800) {
      count = 2;
    } else {
      count = 3;
    }

    // Spread triggers randomly between 15% and 85% of duration
    const start = Math.max(5, Math.floor(duration * 0.15));
    const end = Math.max(start + 5, Math.floor(duration * 0.85));
    const segment = (end - start) / count;

    for (let i = 0; i < count; i++) {
      const segStart = start + i * segment;
      const segEnd = start + (i + 1) * segment;
      const randomSecond = Math.floor(segStart + Math.random() * (segEnd - segStart));
      this.attentionTriggers.push(randomSecond);
    }

    this.attentionTriggers.sort((a, b) => a - b);
  }

  private triggerAttentionCheck(): void {
    if (this.isAttentionModalOpen() || this.isGeneratingQuestion()) return;

    this.isGeneratingQuestion.set(true);
    this.attentionQuestionService.generateQuestion().subscribe({
      next: (q) => {
        this.isGeneratingQuestion.set(false);
        if (q && q.question) {
          this.currentAttentionQuestion.set(q);
          this.isAttentionModalOpen.set(true);
        }
      },
      error: (err) => {
        console.error('Could not generate attention question:', err);
        this.isGeneratingQuestion.set(false);
      },
    });
  }

  private resetAttentionTriggers(): void {
    this.attentionTriggers = [];
    this.handledTriggers.clear();
    this.videoDuration = 0;
    this.isAttentionModalOpen.set(false);
    this.currentAttentionQuestion.set(null);
  }

  onAttentionAnswered(event: { choiceIndex: number; answer: any; isCorrect: boolean; secondsTaken: number }): void {
    // Answer handled by modal
  }

  onPenaltyRecorded(event: { secondsTaken: number }): void {
    const vId = this.activeVideo()?.id;
    if (!vId) return;

    this.attentionQuestionService.recordPenalty({
      videoId: vId,
      secondsTaken: event.secondsTaken,
    }).subscribe({
      next: () => {},
      error: (err) => console.error('Failed to record penalty:', err),
    });
  }

  onAttentionClosed(): void {
    this.isAttentionModalOpen.set(false);
    this.currentAttentionQuestion.set(null);
  }

  ngOnDestroy(): void {
    this.resetAttentionTriggers();
  }
}
