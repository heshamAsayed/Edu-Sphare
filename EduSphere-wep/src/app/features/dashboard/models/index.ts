
export interface AddTeacherRequest {
  name: string;
  email: string;
  mobile?: string;
  roles?: string[];
}

export interface DashboardTeacher {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  roles?: string[];
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
