import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('guards de sesión', () => {
  function run(guard: typeof authGuard, loggedIn: boolean) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: signal(loggedIn) } },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return { result, router: TestBed.inject(Router) };
  }

  it('authGuard deja pasar con sesión', () => {
    expect(run(authGuard, true).result).toBe(true);
  });

  it('authGuard lleva a /login sin sesión', () => {
    const { result, router } = run(authGuard, false);

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('guestGuard deja ver el inicio de sesión sin sesión', () => {
    expect(run(guestGuard, false).result).toBe(true);
  });

  it('guestGuard lleva al tablero si ya hay sesión', () => {
    const { result, router } = run(guestGuard, true);

    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });
});
