export const API_CONFIG = {
  BASE_URL: 'https://alphagen.runasp.net/api',
  TIMEOUT: 10000,
  TOKEN_KEY: 'AlphaGen_Token',
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  ENDPOINTS: {
    ACCOUNT: {
      BASE: '/Account',
      LOGIN: '/Account/login',
      REGISTER: '/Account/register',
      LOGOUT: '/Account/logout',
      ME: '/Account/me',
    },
    COURSES: {
      BASE: '/Courses',
    },
    DASHBOARD: {
      BASE: '/Dashboard',
      ADD_TEACHER: '/Dashboard/AddTeacher',
      REMOVE_TEACHER: '/Dashboard/RemoveTeacher',
      SCHOOLS: '/Dashboard/SchoolsWithStagesAndYears',
      STAGES: '/Dashboard/StagesWithYears',
      YEARS: '/Dashboard/YearsWithCourses',
    },
    LEARNING: {
      BASE: '/Learning',
      LESSON: '/Learning/Lesson',
      MARK_WATCHED: '/Learning/MarkVideoWatched',
      MANAGE_COURSES: '/Learning/ManageCourses',
      COURSE_CONTENT: '/Learning/CourseContent',
      TEACHER_STAGES: '/Learning/TeacherStages',
      CREATE_COURSE: '/Learning/CreateCourse',
      UPLOAD_VIDEO: '/Learning/UploadVideo',
      REORDER_VIDEO: '/Learning/ReorderVideo',
      TRANSCRIPTION_STATUS: '/Learning/GetTranscriptionStatus',
      UPLOAD_PROGRESS: '/Learning/GetUploadProgress',
      BACKGROUND_PROGRESS: '/Learning/GetBackgroundProgress',
    },
    TRANSCRIPTION: {
      BASE: '/Transcription',
    },
    VIDEO_QUIZ: {
      BASE: '/VideoQuiz',
      GENERATE: '/VideoQuiz/generate',
      SUBMIT: '/VideoQuiz/submit',
      SCORE: '/VideoQuiz/score',
      CATALOG: '/VideoQuiz/catalog',
    },
  },
};

