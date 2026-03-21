import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('admin-token') : null;

  const authReq = token && req.url.startsWith('/api')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        localStorage.removeItem('admin-token');
        void router.navigate(['/admin']);
      }
      return throwError(() => error);
    })
  );
};
