import { HttpErrorResponse } from '@angular/common/http';

export function authErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor';
    }
    if (typeof error.error?.error === 'string') {
      return error.error.error;
    }
  }
  return 'Ocurrió un error inesperado';
}
