import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { User } from '../models/user';
import { fakeToken } from '../testing/fake-token';
import { AuthService } from './auth.service';

const API_URL = 'http://localhost:3000/api';
const STORAGE_KEY = 'taskflow.session';
const ana: User = {
  id: 1,
  name: 'Ana',
  email: 'ana@taskflow.ec',
  created_at: '2026-10-03T10:00:00.000Z',
};

describe('AuthService', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  function create(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => http.verify());

  it('empieza sin sesión', () => {
    const auth = create();

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.token()).toBeNull();
  });

  it('inicia sesión, guarda la sesión y expone el usuario', async () => {
    const auth = create();
    const token = fakeToken();

    const result = firstValueFrom(auth.login('ana@taskflow.ec', 'secreta123'));
    const req = http.expectOne(`${API_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@taskflow.ec', password: 'secreta123' });
    req.flush({ token, user: ana });

    expect(await result).toEqual(ana);
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()).toEqual(ana);
    expect(auth.token()).toBe(token);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ token, user: ana });
  });

  it('registra una cuenta y deja la sesión iniciada', async () => {
    const auth = create();

    const result = firstValueFrom(auth.register('Ana', 'ana@taskflow.ec', 'secreta123'));
    const req = http.expectOne(`${API_URL}/auth/register`);
    expect(req.request.body).toEqual({
      name: 'Ana',
      email: 'ana@taskflow.ec',
      password: 'secreta123',
    });
    req.flush({ token: fakeToken(), user: ana }, { status: 201, statusText: 'Created' });

    expect(await result).toEqual(ana);
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('no inicia sesión si la API responde con error', async () => {
    const auth = create();

    const result = firstValueFrom(auth.login('ana@taskflow.ec', 'mala'));
    http
      .expectOne(`${API_URL}/auth/login`)
      .flush(
        { error: 'Correo o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restaura la sesión guardada al recargar la página', () => {
    const token = fakeToken();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: ana }));

    const auth = create();

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()).toEqual(ana);
  });

  it.each([
    ['un token vencido', JSON.stringify({ token: fakeToken(-60), user: ana })],
    ['un token mal formado', JSON.stringify({ token: 'no-es-un-jwt', user: ana })],
    ['datos que no son JSON', '{roto'],
  ])('descarta una sesión guardada con %s', (_caso, stored) => {
    localStorage.setItem(STORAGE_KEY, stored);

    const auth = create();

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('cierra sesión, borra los datos y lleva al inicio de sesión', async () => {
    const auth = create();
    const login = firstValueFrom(auth.login('ana@taskflow.ec', 'secreta123'));
    http.expectOne(`${API_URL}/auth/login`).flush({ token: fakeToken(), user: ana });
    await login;

    auth.logout();

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(auth.notice()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('al expirar la sesión cierra sesión y deja un aviso para la pantalla de inicio', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: fakeToken(), user: ana }));
    const auth = create();

    auth.expire();

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.notice()).toBe('Tu sesión expiró, inicia sesión de nuevo');
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
