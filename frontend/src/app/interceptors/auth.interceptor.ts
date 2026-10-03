import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../api';
import { AuthService } from '../services/auth.service';

// En login y registro un 401 significa credenciales incorrectas, no una sesión vencida.
const CREDENTIAL_ENDPOINTS = [`${API_URL}/auth/login`, `${API_URL}/auth/register`];

/** Envía el token a la API y cierra la sesión cuando la API lo rechaza. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API_URL}/`)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.token();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !CREDENTIAL_ENDPOINTS.includes(req.url)
      ) {
        auth.expire();
      }
      return throwError(() => error);
    }),
  );
};
