import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Solo con sesión; si no, lleva al inicio de sesión. */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/login']);

/** Solo sin sesión (inicio de sesión y registro); si ya hay sesión, lleva al tablero. */
export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/']);
