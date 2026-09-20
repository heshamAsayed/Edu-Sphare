export interface VideoItem {
  id: string;
  bunnyVideoId?: string;
  courseId: string;
  title: string;
  description?: string;
  // tags?: string[];
  createdAt?: string;
  sortOrder: number;
  availabilityDays: number;
}

export interface VideoUploadResponse {
  id: string;
  bunnyVideoId: string;
  courseId: string;
  title: string;
  createdAt: string;
  sortOrder: number;
  availabilityDays: number;
}

export interface VideoBatchItemResult {
  title: string;
  status: string;
  id?: string;
  message?: string;
}

export interface VideoBatchUploadResponse {
  results: VideoBatchItemResult[];
}
