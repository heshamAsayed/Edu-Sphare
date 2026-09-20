// Converted from Web/Views/Learning/Lesson.cshtml
import { Component, OnInit } from '@angular/core';
import { LessonService } from '../../index';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-lesson',
  templateUrl: './lesson.html',
  styleUrls: ['./lesson.css']
})
export class Lesson implements OnInit {
  courseId: string | null = null;
  course: any = null;
  videos: any[] = [];
  activeVideo: any = null;
  loading = false;

  constructor(private service: LessonService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Accept courseId via route or as query param
    this.courseId = this.route.snapshot.paramMap.get('courseId') || this.route.snapshot.queryParamMap.get('courseId');
    if (this.courseId) this.loadLesson(this.courseId);
  }

  loadLesson(courseId: string) {
    this.loading = true;
    this.service.getLesson(courseId).subscribe({
      next: res => {
        this.course = res.course;
        this.videos = res.videos || [];
        this.activeVideo = res.activeVideo || (this.videos.length ? this.videos[0] : null);
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  selectVideo(video: any) {
    this.activeVideo = video;
  }

  markWatched(video: any) {
    if (!video || !video.id) return;
    this.service.markVideoWatched(this.courseId || undefined, video.id).subscribe();
  }
}
