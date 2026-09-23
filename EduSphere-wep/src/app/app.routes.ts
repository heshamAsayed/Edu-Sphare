import { CanActivateFn, Router, Routes } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AccountService } from './features/account/services/account.service';
import { AuthComponent } from './features/account/pages/auth/auth.component/auth.component';
import { FormRegister } from './features/account/components/form-register/form-register';
import { FormLogin } from './features/account/components/form-login/form-login';
import { CompleteProfile } from './features/account/pages/auth/complete-profile/complete-profile';
import { registrationGuard } from './features/account/guards/registration-guard';
import { Home } from './layout/page/home/home';
import { Coursespage } from './layout/page/coursespage/coursespage';
import { CourseDetailsPage } from './layout/page/course-details-page/course-details-page';
import { SchoolsSection } from './features/home/components/schools-section/schools-section';

import { LessonPage } from './layout/page/lesson-page/lesson-page';
import { ManageCourseContentPage } from './layout/page/manage-course-content-page/manage-course-content-page';
import { UploadCoursePage } from './layout/page/upload-course-page/upload-course-page';
import { AssessmentPage } from './layout/page/assessment-page/assessment-page';
import { RestrictedPage } from './layout/page/restricted-page/restricted-page';
import { ProfilePage } from './layout/page/profile-page/profile-page';
import { NotFoundPage } from './layout/page/not-found-page/not-found-page';
import { ManageCoursesPage } from './layout/page/manage-courses-page/manage-courses-page';
import { PaymentCallback } from './features/courses/components/payment-callback/payment-callback';
import { AdminDashboardPage } from './layout/page/admin-dashboard-page/admin-dashboard-page';
import { TeacherDashboardPage } from './layout/page/teacher-dashboard-page/teacher-dashboard-page';

export const authGuard: CanActivateFn = () => {
    const accountService = inject(AccountService);
    const router = inject(Router);

    if (accountService.isAuthenticated()) {
        return true;
    }

    return accountService.checkAuth().pipe(
        map((user) => {
            if (user) return true;
            return router.createUrlTree(['/auth/login']);
        }),
        catchError(() => of(router.createUrlTree(['/auth/login'])))
    );
};

export const guestGuard: CanActivateFn = () => {
    const accountService = inject(AccountService);
    const router = inject(Router);

    return accountService.checkAuth().pipe(
        map((user) => user ? router.createUrlTree(['/profile/me']) : true),
        catchError(() => of(true))
    );
};

export const routes: Routes = [
    {
        path: '',
        component: Home,
    },
    {
        path: 'profile/me',
        canActivate: [authGuard],
        component: ProfilePage,
        data: { tab: 'available' },
    },
    {
        path: 'profile',
        redirectTo: 'profile/me',
        pathMatch: 'full'
    },
    {
        path: 'my-courses',
        canActivate: [authGuard],
        component: ProfilePage,
        data: { tab: 'paid' },
    },
    {
        path: "login",
        redirectTo: 'auth/login',
        pathMatch: 'full'
    },
    {
        path: "registeration",
        redirectTo: 'auth/register',
        pathMatch: 'full'
    },
    {
        path: "auth",
        redirectTo: 'auth/login',
        pathMatch: 'full'
    },
    {
        path: "complete-profile",
        redirectTo: 'auth/complete-profile',
        pathMatch: 'full'
    },
    {
        path: "auth",
        component: AuthComponent,
        children: [
            {
                path: 'login',
                component: FormLogin
            },
            {
                path: 'register',
                component: FormRegister
            }
        ]
    },
    {
        path: 'auth/register/completeprofile',
        canActivate: [registrationGuard],
        component: CompleteProfile
    },

    // Home
    {
        path: 'home',
        component: Home
    },

    // Courses
    {
        path: 'courses/:schoolId/:stageId/:yearId',
        component: Coursespage,
    },
    {
        path: 'course/:courseId',
        component: CourseDetailsPage,
    },
    {
        path: 'payment-callback',
        component: PaymentCallback,
    },

    // Learning & Lesson Routes
    {
        path: 'lesson',
        component: LessonPage,
    },
    {
        path: 'lesson/:courseId',
        component: LessonPage,
    },

    // Teacher Management
    {
        path: 'teacher-dashboard',
        canActivate: [authGuard],
        component: TeacherDashboardPage,
    },
    {
        path: 'manage-courses',
        canActivate: [authGuard],
        component: ManageCoursesPage,
    },
    {
        path: 'manage-course-content/:courseId',
        component: ManageCourseContentPage,
    },
    {
        path: 'upload-course',
        component: UploadCoursePage,
    },

    // Assessment & Quiz
    {
        path: 'assessment',
        component: AssessmentPage,
    },
    {
        path: 'assessment/:courseId',
        component: AssessmentPage,
    },

    // Admin Dashboard (front-end credentials only, no backend auth guard needed)
    {
        path: 'dashboard',
        component: AdminDashboardPage,
    },

    // Restricted Access
    {
        path: 'restricted',
        component: RestrictedPage,
    },
    {
        path: '**',
        component: NotFoundPage,
    },

];

