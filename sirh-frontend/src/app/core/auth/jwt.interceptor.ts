import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken;
  const cloned = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.refreshToken) {
        return auth.refresh().pipe(
          switchMap((session) => {
            const refreshedReq = session?.accessToken
              ? req.clone({
                  setHeaders: { Authorization: `Bearer ${session.accessToken}` },
                })
              : req;
            return next(refreshedReq);
          }),
          catchError((refreshError) => {
            auth.logout();
            return throwError(() => refreshError);
          })
        );
      }
      if (error.status === 401) {
        auth.logout();
        return throwError(() => error);
      }
      if (error.status >= 500) {
        console.error('API error', error.message);
      }
      return throwError(() => error);
    })
  );
};
