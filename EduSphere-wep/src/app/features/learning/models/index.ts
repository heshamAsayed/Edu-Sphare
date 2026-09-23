export interface VideoAttachment {
  name?: string;
  originalFileName?: string;
  url: string;
}

export interface CourseSummary {
  id: string;
  name?: string;
  title?: string;
  schoolName?: string;
  stageName?: string;
  yearName?: string;
  description?: string;
  price?: number;
  instructorId?: string;
  createdAt?: string;
}

export interface LessonVideo {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  availabilityDays?: number;
  isWatched?: boolean;
  bunnyVideoId?: string;
  duration?: number;
  attachments?: VideoAttachment[];
}

export interface TeacherStatisticsItem {
  videoId: string;
  enrolledStudentsCount: number;
  watchedStudentsCount: number;
  averagePostVideoQuizScore: number;
  averageFocusPercent: number;
  absentStudentsCount: number;
}

export interface LessonResponse {
  course: CourseSummary;
  videos: LessonVideo[];
  activeVideo: LessonVideo | null;
  studentId?: string | null;
  teacherStatistics?: TeacherStatisticsItem[];
  isTeacher?: boolean;
}

export interface MarkVideoWatchedRequest {
  courseId?: string;
  videoId: string;
}

export interface MarkVideoWatchedResponse {
  success: boolean;
  videoId: string;
  isWatched: boolean;
  watchedAt?: string;
}

export interface ProgressStatusResponse {
  percent: number;
  bytesUploaded: number;
  totalBytes: number;
  status: string;
  errorMessage?: string;
}

export interface ReorderVideoRequest {
  videoId: string;
  sortOrder: number;
}

export interface UploadVideoResponse {
  success: boolean;
  message?: string;
  videoId?: string;
  bunnyVideoId?: string;
  uploadProgress?: number;
}

export interface TeacherYear {
  id: string;
  name: string;
}

export interface TeacherStage {
  id: string;
  name: string;
  years?: TeacherYear[];
}

export interface TeacherStagesResponse {
  teacherSchoolName: string;
  stages: TeacherStage[];
}

export interface ManageCourseItem {
  id: string;
  name: string;
  price: number;
  videosCount?: number;
  createdAt?: string;
  stageName?: string;
  yearName?: string;
}

export interface ManageCoursesResponse {
  teacherSchoolName?: string;
  stages?: TeacherStage[];
  courses: ManageCourseItem[];
}

export interface CourseContentResponse {
  course: CourseSummary;
  videos: LessonVideo[];
}

export interface CreateCourseRequest {
  name: string;
  price: number;
  stageId: string;
  yearId: string;
  instructorId?: string;
  /** Optional cover image — sent as multipart field "image" */
  image?: File | null;
}

export interface CreateCourseResponse {
  courseId?: string;
  id?: string;
  message?: string;
}

export interface VideoQueueItem {
  file: File;
  title: string;
  sortOrder: number;
  description?: string;
  availabilityDays?: number;
  attachments?: File[];
}

