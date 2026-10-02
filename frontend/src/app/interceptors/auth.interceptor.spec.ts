import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { fakeToken } from '../testing/fake-token';
import { authInterceptor } from './auth.interceptor';

const API_URL = 'http://localhost:3000/api';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  const token = fakeToken();

  function setup(loggedIn: boolean): void {
    localStorage.clear();
    if (loggedIn) {
      localStorage.setItem(
        'taskflow.session',
        JSON.stringify({ token, user: { id: 1, name: 'Ana', email: 'a@b.co', created_at: '' } }),
      );
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'expire').mockImplementation(() => undefined);
  }

  afterEach(() => backend.verify());

  it('agrega el token a las peticiones a la API', () => {
    setup(true);

    http.get(`${API_URL}/tasks`).subscribe();

    const req = backend.expectOne(`${API_URL}/tasks`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush([]);
  });

  it('no envía el token a otros dominios', () => {
    setup(true);

    http.get('https://ejemplo.com/datos').subscribe();

    const req = backend.expectOne('https://ejemplo.com/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('no agrega cabecera si no hay sesión', () => {
    setup(false);

    http.get(`${API_URL}/tasks`).subscribe({ error: () => undefined });

    const req = backend.expectOne(`${API_URL}/tasks`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('ante un 401 de la API expira la sesión y propaga el error', async () => {
    setup(true);

    const result = firstValueFrom(http.get(`${API_URL}/tasks`));
    backend
      .expectOne(`${API_URL}/tasks`)
      .flush({ error: 'Tu sesión expiró' }, { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(auth.expire).toHaveBeenCalledTimes(1);
  });

  it.each(['login', 'register'])('un 401 de /auth/%s no expira la sesión', async (path) => {
    setup(false);

    const result = firstValueFrom(http.post(`${API_URL}/auth/${path}`, {}));
    backend
      .expectOne(`${API_URL}/auth/${path}`)
      .flush(
        { error: 'Correo o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(auth.expire).not.toHaveBeenCalled();
  });

  it('otros errores no expiran la sesión', async () => {
    setup(true);

    const result = firstValueFrom(http.get(`${API_URL}/tasks/9`));
    backend.expectOne(`${API_URL}/tasks/9`).flush({}, { status: 404, statusText: 'Not Found' });

    await expect(result).rejects.toMatchObject({ status: 404 });
    expect(auth.expire).not.toHaveBeenCalled();
  });
});
