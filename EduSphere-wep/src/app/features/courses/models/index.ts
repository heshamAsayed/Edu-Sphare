import { VideoItem } from "../../videos";

export interface CourseListItem {
  id: string;
  title: string;
  description?: string;
  sortOrder?: number;
  imageUrl?: string;
  imagePath?: string;
  price?: number;
  isPaid: boolean;
  teacherId?: string;
  teacherName?: string;
  videosCount?: number;
  videos?: VideoItem[];
}


export interface StudentSelection {
  schoolId: string;
  stageId: string;
  yearId: string;
}

export interface Course extends CourseListItem {
  // same shape as list item; kept explicit for single-item fetches

}
