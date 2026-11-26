import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const roles = (route.data?.['roles'] as string[] | undefined) ?? [];
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!roles.length) {
    return true;
  }
  if (auth.isAuthenticated() && auth.hasAnyRole(roles)) {
    return true;
  }
  if (auth.isAuthenticated()) {
    return router.createUrlTree([auth.defaultRouteForSession()]);
  }
  return router.createUrlTree(['/auth/login'], {
    queryParams: { redirectTo: state.url },
  });
};
