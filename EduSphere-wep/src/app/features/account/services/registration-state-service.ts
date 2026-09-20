import { Injectable } from '@angular/core';
import { RegisterRequest } from './../models/index';
@Injectable({ providedIn: 'root' })
export class RegistrationStateService {
    private data: RegisterRequest = {
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        mobile: '',
        schoolId: null,
        stageId: null,
        yearId: null
    };


    setAccountData(name: string,
        email: string,
        password: string) {

        this.data.name = name;
        this.data.email = email;
        this.data.password = password;
        this.data.confirmPassword = password;

        this.registerStarted = true;
    }

    getData(): RegisterRequest {
        return this.data;
    }


    setEducationData( mobile: string, schoolId: string | null, stageId: string | null, yearId: string | null) {
        this.data.mobile = mobile;
        this.data.schoolId = schoolId;
        this.data.stageId = stageId;
        this.data.yearId = yearId;
    }


    clear(): void {
        this.data = {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            mobile: '',
            schoolId: null,
            stageId: null,
            yearId: null
        };
    }


    private registerStarted = false;
    canAccessCompleteProfile(): boolean {
    return this.registerStarted &&
           !!this.data.name &&
           !!this.data.email &&
           !!this.data.password;
  }


}
