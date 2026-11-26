import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard for the root path ''.
 * Shows the HomePageComponent when not authenticated.
 * Redirects authenticated users to their role-based space:
 * - HR_ADMIN  → /rh-admin
 * - MANAGER   → /manager
 * - EMPLOYEE  → /employee
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true; // let HomePageComponent render
  }

  return router.createUrlTree([auth.defaultRouteForSession()]);
};
