// ── Site Structure ────────────────────────────────────────────────────────────

export interface AddTeacherRequest {
  name: string;
  email: string;
  phoneNumber?: string;
  userName?: string;
  password?: string;
  schoolId?: string | null;
  stageIds?: string[];
  yearIds?: string[];
  mobile?: string;
  roles?: string[];
}

export interface DashboardTeacher {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  phoneNumber?: string;
  schoolId?: string;
  schoolName?: string;
  stageIds?: string[];
  yearIds?: string[];
  roles?: string[];
  courses?: DashboardCourse[];
  coursesCount?: number;
  studentsCount?: number;
}

export interface TeacherProfile {
  id?: string;
  name?: string;
  email?: string;
  schoolName?: string;
}

export interface TeacherCourse {
  id: string;
  name?: string;
  title?: string;
  price?: number;
  createdAt?: string;
  videosCount?: number;
}

export type RemoveTeacherResponse = void;

export interface School {
  id: string;
  name: string;
  imagePath?: string;
  imageUrl?: string;
  stages: Stage[];
}

export interface Stage {
  id: string;
  name: string;
  orderNo?: number;
  schoolId: string;
  years: Year[];
}

export interface Year {
  id: string;
  name: string;
  orderNo?: number;
  stageId?: string;
}

// ── Add site-structure payloads ───────────────────────────────────────────────

export interface AddSchoolPayload {
  name: string;
  imagePath?: string;
}

export interface AddStagePayload {
  name: string;
  orderNo: number;
  schoolId: string;
}

export interface AddYearPayload {
  name: string;
  orderNo: number;
  stageId: string;
}

// ── Financial Report ──────────────────────────────────────────────────────────

export interface FinancialReportFilter {
  teacherId?: string;
  courseId?: string;
  fromDate?: string;       // ISO string  yyyy-MM-dd
}

export interface CoursePaymentSummary {
  courseId: string;
  courseName: string;
  studentsCount: number;
  paymentsCount: number;
  price: number;
  totalAmount: number;
}

export interface TeacherPaymentSummary {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  paymentsCount: number;
  coursesCount: number;
  studentsCount: number;
  totalAmount: number;
  courses: CoursePaymentSummary[];
}

export interface FinancialReportSummary {
  totalPayments: number;
  totalAmount: number;
  uniqueStudents: number;
  uniqueCourses: number;
  uniqueTeachers: number;
}

export interface FinancialReport {
  summary: FinancialReportSummary;
  byTeacher: TeacherPaymentSummary[];
  byCourse: CoursePaymentSummary[];
}

// ── Dashboard Course (used in teacher list) ──────────────────────────────────

export interface DashboardCourse {
  id: string;
  name?: string;
  title?: string;
  price?: number;
  videosCount?: number;
  studentsCount?: number;
}
