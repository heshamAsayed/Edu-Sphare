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
  bunnyLibraryId = input<string>('728031');
  errorMessage = input<string | null>(null);
  isWatched = input<boolean>(false);

  markWatched = output<LessonVideo>();
  timeUpdate = output<{ currentTime: number; duration: number }>();
  videoPlay = output<void>();
  videoPause = output<void>();
  videoEnded = output<void>();

  isPlaying = signal<boolean>(false);
  private bunnyPlayerInstance: any = null;
  private readonly defaultFallbackVideo =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  hasBunnyVideo = computed<boolean>(() => {
    const v = this.video();
    const id = v?.bunnyVideoId?.trim();
    return !!id && id.length > 5;
  });

  bunnyVideoUrl = computed<SafeResourceUrl | null>(() => {
    const v = this.video();
    const libId = this.bunnyLibraryId();
    const bId = v?.bunnyVideoId?.trim();
    if (!bId || bId.length <= 5) return null;

    const url = `https://iframe.mediadelivery.net/embed/${libId}/${bId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true&playerjs=true`;
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
      if (v && this.hasBunnyVideo()) {
        setTimeout(() => this.setupBunnyPlayer(), 300);
      }
    });
  }

  ngAfterViewInit(): void {
    window.addEventListener('message', this.handlePostMessage);
    if (this.hasBunnyVideo()) {
      setTimeout(() => this.setupBunnyPlayer(), 400);
    }
  }

  private setupBunnyPlayer(): void {
    const iframe = this.bunnyIframeRef?.nativeElement;
    if (!iframe) return;

    if (typeof (window as any).playerjs !== 'undefined') {
      try {
        if (this.bunnyPlayerInstance && typeof this.bunnyPlayerInstance.destroy === 'function') {
          this.bunnyPlayerInstance.destroy();
        }

        this.bunnyPlayerInstance = new (window as any).playerjs.Player(iframe);
        this.bunnyPlayerInstance.on('ready', () => {
          this.bunnyPlayerInstance.getDuration((dur: number) => {
            if (dur && dur > 0) {
              this.timeUpdate.emit({ currentTime: 0, duration: Number(dur) });
            }
          });
        });

        this.bunnyPlayerInstance.on('play', () => {
          this.isPlaying.set(true);
          this.videoPlay.emit();
        });

        this.bunnyPlayerInstance.on('pause', () => {
          this.isPlaying.set(false);
          this.videoPause.emit();
        });

        this.bunnyPlayerInstance.on('timeupdate', (data: { seconds?: number; duration?: number }) => {
          if (data && data.seconds != null && data.duration != null) {
            this.isPlaying.set(true);
            this.timeUpdate.emit({
              currentTime: Number(data.seconds),
              duration: Number(data.duration),
            });
          }
        });

        this.bunnyPlayerInstance.on('ended', () => {
          this.isPlaying.set(false);
          this.videoEnded.emit();
        });
      } catch (e) {
        console.error('Could not attach playerjs instance:', e);
      }
    }
  }

  private handlePostMessage = (event: MessageEvent): void => {
    if (!event.data) return;
    try {
      const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (payload?.event === 'timeupdate' && payload?.value) {
        const seconds = Number(payload.value.seconds ?? 0);
        const duration = Number(payload.value.duration ?? 0);
        this.isPlaying.set(true);
        this.timeUpdate.emit({ currentTime: seconds, duration });
      } else if (payload?.event === 'play') {
        this.isPlaying.set(true);
        this.videoPlay.emit();
      } else if (payload?.event === 'pause') {
        this.isPlaying.set(false);
        this.videoPause.emit();
      } else if (payload?.event === 'ended') {
        this.isPlaying.set(false);
        this.videoEnded.emit();
      }
    } catch {
      // Safely ignore non-player postMessages
    }
  };

  onHtmlPlay(): void {
    this.isPlaying.set(true);
    this.videoPlay.emit();
  }

  onHtmlPause(): void {
    this.isPlaying.set(false);
    this.videoPause.emit();
  }

  onHtmlTimeUpdate(event: Event): void {
    const videoEl = event.target as HTMLVideoElement;
    if (!videoEl) return;
    this.isPlaying.set(true);
    this.timeUpdate.emit({
      currentTime: videoEl.currentTime,
      duration: videoEl.duration || 0,
    });
  }

  onHtmlEnded(): void {
    this.isPlaying.set(false);
    this.videoEnded.emit();
  }

  onMarkWatched(): void {
    const v = this.video();
    if (v) {
      this.markWatched.emit(v);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.handlePostMessage);
    if (this.bunnyPlayerInstance && typeof this.bunnyPlayerInstance.destroy === 'function') {
      try {
        this.bunnyPlayerInstance.destroy();
      } catch {}
    }
  }
}
