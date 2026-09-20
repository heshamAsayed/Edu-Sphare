export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobile: string;
  schoolId: string | null;
  stageId: string | null;
  yearId: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  token: string;
  message: string;
}

export interface PaidCourseDto {
  id?: string;
  courseId?: string;
  courseName?: string;
  price?: number;
  paidAt?: string;
  paymentMethod?: string;
  codePaid?: string;
  teacherId?: string;
}

export interface AccountSummary {
  id?: string;
  name: string;
  email: string;
  mobile?: string;
  phoneNumber?: string;
  yearId?: string;
  stageId?: string;
  schoolId?: string;
  yearName?: string;
  stageName?: string;
  schoolName?: string;
  createdAt?: string;
  role?: string;
  roles?: string[];
  isStudent?: boolean;
  courses?: any[];
  paidCourses?: PaidCourseDto[];
  message?: string;
}

export interface LogoutResponse {
  message: string;
}
