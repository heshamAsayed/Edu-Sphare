import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, catchError, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccountService } from '../../../features/account/services/account.service';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { AttentionQuestionService } from '../../../features/attention-question/attention-question.service';
import { AttentionQuestion } from '../../../features/attention-question/models';
import { TranscriptionService } from '../../../features/transcription';
import { VideoQuizService } from '../../../features/video-quiz';
import { QuizQuestion, QuizSubmitResponse } from '../../../features/video-quiz/models';
import { VideoQuizCatalogService } from '../../../features/video-quiz-catalog';
import {
  AttentionModal,
  CourseSummary,
  LearningService,
  LessonEndQuiz,
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
    LessonEndQuiz,
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
  private transcriptionService = inject(TranscriptionService);
  private videoQuizService = inject(VideoQuizService);
  private videoQuizCatalogService = inject(VideoQuizCatalogService);

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

  isAttentionModalOpen = signal<boolean>(false);
  currentAttentionQuestion = signal<AttentionQuestion | null>(null);
  isGeneratingQuestion = signal<boolean>(false);

  /** Inline end-of-video quiz (replaces player slot only) */
  showEndQuiz = signal(false);
  quizLoading = signal(false);
  quizError = signal<string | null>(null);
  quizQuestions = signal<QuizQuestion[]>([]);
  quizSubmitting = signal(false);
  quizResult = signal<QuizSubmitResponse | null>(null);

  /** True only while the student is actively playing the video */
  private isPlaying = false;
  private videoDuration = 0;
  private lastCurrentTime = 0;
  private markedWatchedIds = new Set<string>();
  private markingInFlight = false;

  /**
   * Attention flow:
   * 1) Call API as soon as the video is selected / play starts
   * 2) Keep API results in memory
   * 3) Show at fixed times inside the middle third (early in that window)
   */
  private static readonly ATTENTION_LONG_VIDEO_SEC = 20 * 60;
  private apiAttentionQueue: AttentionQuestion[] = [];
  private attentionTriggersSec: number[] = [];
  private attentionShownCount = 0;
  private attentionTargetCount = 1;
  private attentionFetchInFlight = false;
  private attentionFetchVideoId: string | null = null;
  private attentionFailCount = 0;
  private attentionSub: Subscription | null = null;

  /**
   * Video id for which end-quiz was already opened in the current viewing session.
   * Cleared on every video switch / back-to-video so the next completion can open again
   * without a full page refresh.
   */
  private quizGateVideoId: string | null = null;
  private quizRequestId = 0;
  private quizSub: Subscription | null = null;

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
    this.resetAttentionState();
    this.resetQuizSession();

    this.learningService.getLesson(id).subscribe({
      next: (res: LessonResponse) => {
        this.course.set(res.course);
        const vids = res.videos || [];
        this.videos.set(vids);
        const initialActive = res.activeVideo || (vids.length > 0 ? vids[0] : null);
        this.activeVideo.set(initialActive);
        this.isLoading.set(false);

        for (const v of vids) {
          if (v.isWatched) this.markedWatchedIds.add(v.id);
        }

        if (initialActive) {
          this.loadTranscription(initialActive.id);
          this.startAttentionForVideo(initialActive.id);
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
    // Always clear quiz gate BEFORE changing active video so the next
    // finished video can open its quiz without a page refresh.
    this.resetQuizSession();
    this.activeVideo.set(video);
    this.resetAttentionState();
    this.isPlaying = false;
    this.loadTranscription(video.id);
    // Start API fetch immediately — don't wait for play / middle third
    this.startAttentionForVideo(video.id);
  }

  loadTranscription(videoId: string): void {
    this.isLoadingTranscription.set(true);
    this.transcriptionText.set(null);

    this.transcriptionService.getVideoTranscription(videoId).subscribe({
      next: (res) => {
        this.transcriptionText.set(res.transcriptionText?.trim() || null);
        this.isLoadingTranscription.set(false);
      },
      error: () => {
        this.transcriptionText.set(null);
        this.isLoadingTranscription.set(false);
      },
    });
  }

  onVideoPlay(): void {
    this.isPlaying = true;
    this.ensureAttentionApiFilled();
    this.tryShowDueAttention();
  }

  onVideoPause(): void {
    this.isPlaying = false;
  }

  /**
   * Auto-mark watched at ≥90% of real duration.
   * Attention: API fetch starts on select; show at early middle-third times.
   * Near end (≥98%) also opens the end-of-video quiz (Bunny ended is unreliable).
   */
  onTimeUpdate(event: { currentTime: number; duration: number; progressPercent: number }): void {
    const { currentTime, duration, progressPercent } = event;
    if (!duration || duration <= 0) return;

    this.lastCurrentTime = currentTime;

    // Bunny/Player.js often emits timeupdate without a prior play event
    if (currentTime > 0.25 && progressPercent < 99.5) {
      this.isPlaying = true;
    }

    if (this.videoDuration !== duration) {
      this.videoDuration = duration;
      this.setupAttentionTriggers(duration);
      this.ensureAttentionApiFilled();
    } else if (this.attentionTriggersSec.length === 0) {
      this.setupAttentionTriggers(duration);
    }

    if (progressPercent >= 90) {
      this.autoMarkWatched();
    }

    this.ensureAttentionApiFilled();
    this.tryShowDueAttention();

    if (progressPercent >= 98) {
      this.openEndOfVideoQuiz();
    }
  }

  onVideoEnded(): void {
    this.isPlaying = false;
    this.autoMarkWatched();
    this.openEndOfVideoQuiz();
  }

  onReloadQuiz(): void {
    this.openEndOfVideoQuiz(true);
  }

  private openEndOfVideoQuiz(forceReload = false): void {
    const video = this.activeVideo();
    if (!video) return;

    // Already showing this quiz (unless explicit reload)
    if (this.showEndQuiz() && !forceReload) return;

    // Already opened for this video in the current viewing session
    if (!forceReload && this.quizGateVideoId === video.id) return;

    // Don't start a second load while one is in flight for the same video
    if (forceReload && this.quizLoading()) return;

    this.quizGateVideoId = video.id;
    this.showEndQuiz.set(true);
    this.quizLoading.set(true);
    this.quizError.set(null);
    this.quizQuestions.set([]);
    this.quizResult.set(null);

    const videoId = video.id;
    const requestId = ++this.quizRequestId;
    this.quizSub?.unsubscribe();

    // 1) VideoQuizCatalog — الأسئلة المخزّنة للفيديو
    // 2) VideoQuiz/generate — لو مفيش كاش، تولّد من التفريغ على السيرفر
    this.quizSub = this.videoQuizCatalogService
      .getVideoQuizCatalog(videoId)
      .pipe(
        switchMap((catalog) => {
          if (catalog?.hasQuestions && catalog.questions?.length) {
            return of({ kind: 'ok' as const, questions: this.mapCatalogQuestions(catalog.questions) });
          }
          return this.videoQuizService.generateQuiz(videoId).pipe(
            switchMap((gen) => {
              if (gen?.success && gen.questions?.length) {
                return of({ kind: 'ok' as const, questions: gen.questions });
              }
              return of({
                kind: 'error' as const,
                message: 'No quiz questions available for this lesson yet.',
              });
            }),
            catchError((err) =>
              of({
                kind: 'error' as const,
                message:
                  err?.error?.message ||
                  err?.error?.error ||
                  err?.message ||
                  'Failed to generate quiz.',
              })
            )
          );
        }),
        catchError(() =>
          this.videoQuizService.generateQuiz(videoId).pipe(
            switchMap((gen) => {
              if (gen?.success && gen.questions?.length) {
                return of({ kind: 'ok' as const, questions: gen.questions });
              }
              return of({
                kind: 'error' as const,
                message: 'No quiz questions available for this lesson yet.',
              });
            }),
            catchError((err) =>
              of({
                kind: 'error' as const,
                message:
                  err?.error?.message ||
                  err?.error?.error ||
                  err?.message ||
                  'Failed to load quiz.',
              })
            )
          )
        )
      )
      .subscribe({
        next: (outcome) => {
          // Ignore stale responses after switching videos / closing quiz
          if (requestId !== this.quizRequestId || this.activeVideo()?.id !== videoId) return;

          this.quizLoading.set(false);
          if (outcome.kind === 'ok') {
            this.quizQuestions.set(outcome.questions);
            this.quizError.set(null);
          } else {
            this.quizQuestions.set([]);
            this.quizError.set(outcome.message);
          }
        },
        error: () => {
          if (requestId !== this.quizRequestId || this.activeVideo()?.id !== videoId) return;
          this.quizLoading.set(false);
          this.quizError.set('Unable to load the end-of-lesson quiz.');
        },
      });
  }

  private mapCatalogQuestions(
    questions: Array<{ type: string; question: string; options?: string[]; correctAnswer: number | boolean }>
  ): QuizQuestion[] {
    return questions.map((q) => ({
      type: String(q.type || '').toLowerCase().includes('true') ? 'TrueFalse' : 'MCQ',
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));
  }

  onQuizSubmit(answers: Array<number | boolean>): void {
    const video = this.activeVideo();
    if (!video || this.quizSubmitting()) return;

    this.quizSubmitting.set(true);
    this.videoQuizService.submitQuiz({ videoId: video.id, answers }).subscribe({
      next: (res) => {
        this.quizSubmitting.set(false);
        this.quizResult.set(res);
      },
      error: (err) => {
        this.quizSubmitting.set(false);
        this.quizError.set(err?.error?.message || err?.message || 'Failed to submit quiz.');
      },
    });
  }

  onBackToVideo(): void {
    // Clear gate so rewatching this video to the end opens the quiz again
    this.resetQuizSession();
    this.resetAttentionState();
    this.isPlaying = false;
  }

  /** Hide quiz UI and allow the next video completion to open a quiz. */
  private resetQuizSession(): void {
    this.quizRequestId++;
    this.quizSub?.unsubscribe();
    this.quizSub = null;
    this.quizGateVideoId = null;
    this.showEndQuiz.set(false);
    this.quizLoading.set(false);
    this.quizError.set(null);
    this.quizQuestions.set([]);
    this.quizSubmitting.set(false);
    this.quizResult.set(null);
  }

  private autoMarkWatched(): void {
    const video = this.activeVideo();
    if (!video?.id) return;
    if (video.isWatched || this.markedWatchedIds.has(video.id) || this.markingInFlight) return;

    this.markingInFlight = true;
    const courseId = this.courseId() || undefined;

    this.learningService.markVideoWatched({ courseId, videoId: video.id }).subscribe({
      next: () => {
        this.markingInFlight = false;
        this.markedWatchedIds.add(video.id);
        const updatedList = this.videos().map((v) =>
          v.id === video.id ? { ...v, isWatched: true } : v
        );
        this.videos.set(updatedList);
        if (this.activeVideo()?.id === video.id) {
          this.activeVideo.set({ ...video, isWatched: true });
        }
      },
      error: (e) => {
        this.markingInFlight = false;
        console.error('Failed to auto-mark watched:', e);
      },
    });
  }

  /**
   * Middle third only. Fixed early times so it never feels "at the end":
   * - 1 question → 40% of duration
   * - 2 questions (>20 min) → 40% and 55%
   */
  private setupAttentionTriggers(duration: number): void {
    if (duration <= 0) return;

    const needed = duration > LessonPage.ATTENTION_LONG_VIDEO_SEC ? 2 : 1;
    this.attentionTargetCount = needed;

    if (this.attentionTriggersSec.length === needed) return;

    if (needed === 1) {
      this.attentionTriggersSec = [Math.floor(duration * 0.4)];
    } else if (this.attentionTriggersSec.length === 0) {
      this.attentionTriggersSec = [Math.floor(duration * 0.4), Math.floor(duration * 0.55)];
    } else if (this.attentionTriggersSec.length === 1 && needed === 2) {
      this.attentionTriggersSec = [this.attentionTriggersSec[0], Math.floor(duration * 0.55)];
    }
  }

  private startAttentionForVideo(videoId: string): void {
    this.attentionFetchVideoId = videoId;
    this.apiAttentionQueue = [];
    this.attentionShownCount = 0;
    this.attentionFailCount = 0;
    this.ensureAttentionApiFilled();
  }

  /** Fetch from API one-by-one until we have enough questions for this video. */
  private ensureAttentionApiFilled(): void {
    const videoId = this.activeVideo()?.id;
    if (!videoId || this.showEndQuiz()) return;

    if (this.attentionFetchVideoId !== videoId) {
      this.startAttentionForVideo(videoId);
      return;
    }

    if (this.apiAttentionQueue.length >= this.attentionTargetCount) return;
    if (this.attentionFetchInFlight) return;

    this.attentionFetchInFlight = true;
    this.isGeneratingQuestion.set(true);
    this.attentionSub?.unsubscribe();

    this.attentionSub = this.attentionQuestionService.generateQuestion().pipe(
      map((raw) => this.normalizeAttentionQuestion(raw)),
      catchError((err) => {
        console.error('Attention API failed:', err);
        return of(null);
      })
    ).subscribe({
      next: (q) => {
        this.attentionFetchInFlight = false;
        this.isGeneratingQuestion.set(false);
        if (this.activeVideo()?.id !== videoId) return;

        if (q) {
          this.attentionFailCount = 0;
          this.apiAttentionQueue.push(q);
          // Show immediately if trigger time already passed
          this.tryShowDueAttention();
          // Need another question (long video)?
          if (this.apiAttentionQueue.length < this.attentionTargetCount) {
            this.ensureAttentionApiFilled();
          }
        } else {
          this.attentionFailCount++;
          if (this.attentionFailCount >= 2) {
            // Last resort so the check still appears if API keeps failing
            this.apiAttentionQueue.push(this.buildLocalFallbackQuestion());
            this.tryShowDueAttention();
            if (this.apiAttentionQueue.length < this.attentionTargetCount) {
              this.apiAttentionQueue.push(this.buildLocalFallbackQuestion());
            }
          } else {
            setTimeout(() => this.ensureAttentionApiFilled(), 800);
          }
        }
      },
      error: () => {
        this.attentionFetchInFlight = false;
        this.isGeneratingQuestion.set(false);
        this.attentionFailCount++;
        setTimeout(() => this.ensureAttentionApiFilled(), 800);
      },
    });
  }

  /**
   * Show next due question as soon as:
   * - playback is active
   * - current time >= trigger
   * - API question is already in memory
   */
  private tryShowDueAttention(): void {
    if (!this.isPlaying || this.isAttentionModalOpen() || this.showEndQuiz()) return;
    if (this.attentionShownCount >= this.attentionTriggersSec.length) return;

    const triggerAt = this.attentionTriggersSec[this.attentionShownCount];
    if (triggerAt == null || this.lastCurrentTime < triggerAt) return;

    const q = this.apiAttentionQueue[this.attentionShownCount];
    if (!q) {
      // Due now but API still loading — keep requesting
      this.ensureAttentionApiFilled();
      return;
    }

    this.attentionShownCount += 1;
    this.currentAttentionQuestion.set(q);
    this.isAttentionModalOpen.set(true);
  }

  private buildLocalFallbackQuestion(): AttentionQuestion {
    const school = this.schoolName();
    const name = this.accountService.currentUser()?.name || 'الطالب';
    const useTf = Math.random() < 0.5;
    if (useTf) {
      return {
        type: 'TrueFalse',
        question: `هل تتابع الدرس الآن يا ${name}؟`,
        options: undefined,
        correctAnswer: true,
      };
    }
    const options = [school, 'مدرسة النور', 'مدرسة الأمل', 'مدرسة المستقبل'];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      type: 'MCQ',
      question: 'ما اسم مدرستك؟',
      options,
      correctAnswer: options.indexOf(school),
    };
  }

  private normalizeAttentionQuestion(raw: any): AttentionQuestion | null {
    if (!raw) return null;
    const question = String(raw.question ?? raw.Question ?? '').trim();
    if (!question) return null;
    return {
      type: String(raw.type ?? raw.Type ?? 'MCQ'),
      question,
      options: raw.options ?? raw.Options ?? undefined,
      correctAnswer: raw.correctAnswer ?? raw.CorrectAnswer,
    };
  }

  private resetAttentionState(): void {
    this.attentionSub?.unsubscribe();
    this.attentionSub = null;
    this.attentionFetchInFlight = false;
    this.attentionFetchVideoId = null;
    this.apiAttentionQueue = [];
    this.attentionTriggersSec = [];
    this.attentionShownCount = 0;
    this.attentionTargetCount = 1;
    this.attentionFailCount = 0;
    this.videoDuration = 0;
    this.lastCurrentTime = 0;
    this.isGeneratingQuestion.set(false);
    this.isAttentionModalOpen.set(false);
    this.currentAttentionQuestion.set(null);
  }

  onAttentionAnswered(_event: {
    choiceIndex: number;
    answer: any;
    isCorrect: boolean;
    secondsTaken: number;
  }): void {
    // Answer handled by modal — video keeps playing
  }

  onPenaltyRecorded(event: { secondsTaken: number }): void {
    const vId = this.activeVideo()?.id;
    if (!vId) return;

    this.attentionQuestionService
      .recordPenalty({
        videoId: vId,
        secondsTaken: event.secondsTaken,
      })
      .subscribe({
        next: () => {},
        error: (err) => console.error('Failed to record penalty:', err),
      });
  }

  onAttentionClosed(): void {
    this.isAttentionModalOpen.set(false);
    this.currentAttentionQuestion.set(null);
    // After closing Q1, immediately check if Q2 is already due
    this.tryShowDueAttention();
  }

  ngOnDestroy(): void {
    this.resetAttentionState();
    this.resetQuizSession();
  }
}
