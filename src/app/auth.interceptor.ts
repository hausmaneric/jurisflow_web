import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { apiURL } from './resources';
import { LoginService } from './services/login.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const loginService = inject(LoginService);
  const router = inject(Router);
  const isApiRequest = request.url.startsWith(apiURL);
  const isAuthRequest = request.url.includes('/auth/login') || request.url.includes('/auth/refresh');

  if (!isApiRequest) {
    return next(request);
  }

  const token = loginService.getToken();
  const authorizedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const refreshToken = loginService.getRefreshToken();
      if (error.status !== 401 || isAuthRequest || !refreshToken) {
        return throwError(() => error);
      }

      return loginService.refresh(refreshToken).pipe(
        switchMap((response) => {
          const renewedToken = response?.data?.access_token;
          if (!response?.status || !renewedToken) {
            throw error;
          }

          loginService.updateAccessToken(renewedToken);
          return next(request.clone({ setHeaders: { Authorization: `Bearer ${renewedToken}` } }));
        }),
        catchError((refreshError) => {
          loginService.clearToken();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
