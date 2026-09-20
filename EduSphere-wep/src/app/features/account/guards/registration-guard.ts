import { CanActivateFn, Router } from '@angular/router';
import { RegistrationStateService } from '../services/registration-state-service';
import { inject } from '@angular/core';

export const registrationGuard: CanActivateFn = (route, state) => {
  const registerState = inject(RegistrationStateService);
  const router = inject(Router);
   if (registerState.canAccessCompleteProfile()) {
    return true;
  }

  return router.createUrlTree(['/register']);
};
