import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { API_CONFIG } from '../../../../core/config/api-config';
import { LessonVideo } from '../../models';

@Component({
  selector: 'app-lesson-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-player.html',
  styleUrl: './lesson-player.css',
})
export class LessonPlayer implements AfterViewInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);

  @ViewChild('bunnyIframe') bunnyIframeRef?: ElementRef<HTMLIFrameElement>;
  @ViewChild('htmlVideo') htmlVideoRef?: ElementRef<HTMLVideoElement>;

  video = input<LessonVideo | null>(null);
  bunnyLibraryId = input<string>(API_CONFIG.BUNNY_LIBRARY_ID);
  errorMessage = input<string | null>(null);

  timeUpdate = output<{ currentTime: number; duration: number; progressPercent: number }>();
  videoPlay = output<void>();
  videoPause = output<void>();
  videoEnded = output<void>();

  isPlaying = signal<boolean>(false);
  private bunnyPlayerInstance: any = null;
  private endedEmitted = false;
  private playEmitted = false;
  private boundIframe: HTMLIFrameElement | null = null;
  private readonly defaultFallbackVideo =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  hasBunnyVideo = computed<boolean>(() => {
    const v = this.video();
    const id = v?.bunnyVideoId?.trim();
    return !!id && id.length > 5;
  });

  /**
   * Bunny Stream embed URL (official docs):
   * https://player.mediadelivery.net/embed/{libraryId}/{videoId}
   */
  bunnyVideoUrl = computed<SafeResourceUrl | null>(() => {
    const v = this.video();
    const libId = (this.bunnyLibraryId() || API_CONFIG.BUNNY_LIBRARY_ID).trim();
    const bId = v?.bunnyVideoId?.trim();
    if (!bId || bId.length <= 5 || !libId) return null;

    // Unique src avoids Player.js conflicts when switching videos
    const url =
      `https://player.mediadelivery.net/embed/${libId}/${bId}` +
      `?autoplay=false&loop=false&muted=false&preload=true&responsive=true&playsinline=true` +
      `&v=${encodeURIComponent(bId)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  fallbackVideoUrl = computed<string>(() => {
    const v = this.video();
    const res = (v as any)?.resource?.trim();
    if (res && (res.startsWith('http://') || res.startsWith('https://'))) {
      return res;
    }
    return this.defaultFallbackVideo;
  });

  constructor() {
    effect(() => {
      const v = this.video();
      this.endedEmitted = false;
      this.playEmitted = false;
      this.isPlaying.set(false);
      if (v && this.hasBunnyVideo()) {
        setTimeout(() => this.setupBunnyPlayer(), 400);
      }
    });
  }

  ngAfterViewInit(): void {
    window.addEventListener('message', this.handlePostMessage);
    if (this.hasBunnyVideo()) {
      setTimeout(() => this.setupBunnyPlayer(), 500);
    }
  }

  /** Pause playback (used when attention check appears). */
  pause(): void {
    try {
      this.bunnyPlayerInstance?.pause?.();
    } catch {}
    this.htmlVideoRef?.nativeElement?.pause();
    this.isPlaying.set(false);
  }

  /** Resume playback after attention check. */
  play(): void {
    try {
      this.bunnyPlayerInstance?.play?.();
    } catch {}
    void this.htmlVideoRef?.nativeElement?.play();
  }

  private emitPlayingOnce(): void {
    if (this.playEmitted) {
      this.isPlaying.set(true);
      return;
    }
    this.playEmitted = true;
    this.isPlaying.set(true);
    this.videoPlay.emit();
  }

  private emitEndedOnce(): void {
    if (this.endedEmitted) return;
    this.endedEmitted = true;
    this.isPlaying.set(false);
    this.videoEnded.emit();
  }

  private setupBunnyPlayer(): void {
    const iframe = this.bunnyIframeRef?.nativeElement;
    if (!iframe) return;

    if (typeof (window as any).playerjs === 'undefined') {
      setTimeout(() => this.setupBunnyPlayer(), 400);
      return;
    }

    try {
      if (this.bunnyPlayerInstance && typeof this.bunnyPlayerInstance.destroy === 'function') {
        this.bunnyPlayerInstance.destroy();
      }

      this.boundIframe = iframe;
      this.bunnyPlayerInstance = new (window as any).playerjs.Player(iframe);
      this.bunnyPlayerInstance.on('ready', () => {
        this.bunnyPlayerInstance.getDuration((dur: number) => {
          if (dur && dur > 0) {
            this.emitProgress(0, Number(dur));
          }
        });
      });

      this.bunnyPlayerInstance.on('play', () => {
        this.emitPlayingOnce();
      });

      this.bunnyPlayerInstance.on('pause', () => {
        this.isPlaying.set(false);
        this.videoPause.emit();
      });

      this.bunnyPlayerInstance.on('timeupdate', (data: { seconds?: number; duration?: number }) => {
        if (data && data.seconds != null && data.duration != null) {
          const seconds = Number(data.seconds);
          const duration = Number(data.duration);
          if (seconds > 0.25) {
            this.emitPlayingOnce();
          }
          this.emitProgress(seconds, duration);
          if (duration > 0 && seconds / duration >= 0.985) {
            this.emitEndedOnce();
          }
        }
      });

      this.bunnyPlayerInstance.on('ended', () => {
        this.emitEndedOnce();
      });
    } catch (e) {
      console.error('Could not attach playerjs instance:', e);
    }
  }

  private emitProgress(currentTime: number, duration: number): void {
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    this.timeUpdate.emit({ currentTime, duration, progressPercent });
  }

  private handlePostMessage = (event: MessageEvent): void => {
    if (!event.data) return;
    // Ignore messages from other iframes / leftover players after video switch
    if (this.boundIframe?.contentWindow && event.source && event.source !== this.boundIframe.contentWindow) {
      return;
    }
    try {
      const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (payload?.event === 'timeupdate' && payload?.value) {
        const seconds = Number(payload.value.seconds ?? 0);
        const duration = Number(payload.value.duration ?? 0);
        if (seconds > 0.25) {
          this.emitPlayingOnce();
        }
        this.emitProgress(seconds, duration);
        if (duration > 0 && seconds / duration >= 0.985) {
          this.emitEndedOnce();
        }
      } else if (payload?.event === 'play') {
        this.emitPlayingOnce();
      } else if (payload?.event === 'pause') {
        this.isPlaying.set(false);
        this.videoPause.emit();
      } else if (payload?.event === 'ended') {
        this.emitEndedOnce();
      }
    } catch {
      // ignore non-player messages
    }
  };

  onHtmlPlay(): void {
    this.emitPlayingOnce();
  }

  onHtmlPause(): void {
    this.isPlaying.set(false);
    this.videoPause.emit();
  }

  onHtmlTimeUpdate(event: Event): void {
    const videoEl = event.target as HTMLVideoElement;
    if (!videoEl) return;
    if (videoEl.currentTime > 0.25) {
      this.emitPlayingOnce();
    }
    this.emitProgress(videoEl.currentTime, videoEl.duration || 0);
  }

  onHtmlEnded(): void {
    this.emitEndedOnce();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.handlePostMessage);
    this.boundIframe = null;
    if (this.bunnyPlayerInstance && typeof this.bunnyPlayerInstance.destroy === 'function') {
      try {
        this.bunnyPlayerInstance.destroy();
      } catch {}
    }
  }
}
