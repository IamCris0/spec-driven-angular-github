import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../api';
import { AuthResponse, User } from '../models/user';

const STORAGE_KEY = 'taskflow.session';

type Session = AuthResponse;

/** Lee la fecha de expiración del token. La firma la verifica la API, no el navegador. */
function isExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp !== 'number' || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function readStoredSession(): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Session | null;
    if (session?.token && session.user && !isExpired(session.token)) {
      return session;
    }
  } catch {
    // Datos corruptos: se descartan abajo.
  }
  localStorage.removeItem(STORAGE_KEY);
  return null;
}

/** Sesión del usuario: la guarda en localStorage para que sobreviva a una recarga. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(readStoredSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  /** Mensaje que la pantalla de inicio de sesión muestra una vez (por ejemplo, sesión expirada). */
  readonly notice = signal<string | null>(null);

  login(email: string, password: string): Observable<User> {
    return this.start(this.http.post<AuthResponse>(`${API_URL}/auth/login`, { email, password }));
  }

  register(name: string, email: string, password: string): Observable<User> {
    return this.start(
      this.http.post<AuthResponse>(`${API_URL}/auth/register`, { name, email, password }),
    );
  }

  logout(): void {
    this.end(null);
  }

  /** Llamado cuando la API rechaza el token. */
  expire(): void {
    this.end('Tu sesión expiró, inicia sesión de nuevo');
  }

  private start(request: Observable<AuthResponse>): Observable<User> {
    return request.pipe(
      tap((session) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        this.session.set(session);
        this.notice.set(null);
      }),
      map((session) => session.user),
    );
  }

  private end(notice: string | null): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.notice.set(notice);
    void this.router.navigateByUrl('/login');
  }
}
