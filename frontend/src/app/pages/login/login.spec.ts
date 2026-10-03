import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let root: HTMLElement;
  let response: Subject<User>;
  let auth: { login: ReturnType<typeof vi.fn>; notice: ReturnType<typeof signal<string | null>> };
  let navigate: ReturnType<typeof vi.spyOn>;

  const field = (name: string) =>
    root.querySelector<HTMLInputElement>(`[formcontrolname="${name}"]`)!;
  const type = (name: string, value: string) => {
    field(name).value = value;
    field(name).dispatchEvent(new Event('input'));
  };
  const alert = () => root.querySelector('[role="alert"]')?.textContent?.trim();
  async function submit(): Promise<void> {
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function setup(notice: string | null = null): Promise<void> {
    response = new Subject<User>();
    auth = { login: vi.fn(() => response), notice: signal(notice) };
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    root = fixture.nativeElement;
    await fixture.whenStable();
  }

  it('pide correo y contraseña antes de llamar a la API', async () => {
    await setup();

    await submit();

    expect(root.textContent).toContain('Ingresa tu correo');
    expect(root.textContent).toContain('Ingresa tu contraseña');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('inicia sesión y va al tablero', async () => {
    await setup();
    type('email', ' ana@taskflow.ec ');
    type('password', 'secreta123');

    await submit();
    response.next({ id: 1, name: 'Ana', email: 'ana@taskflow.ec', created_at: '' });
    response.complete();
    await fixture.whenStable();

    expect(auth.login).toHaveBeenCalledWith('ana@taskflow.ec', 'secreta123');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('muestra el error de la API', async () => {
    await setup();
    type('email', 'ana@taskflow.ec');
    type('password', 'incorrecta');

    await submit();
    response.error(
      new HttpErrorResponse({ status: 401, error: { error: 'Correo o contraseña incorrectos' } }),
    );
    await fixture.whenStable();

    expect(alert()).toBe('Correo o contraseña incorrectos');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('avisa si no hay conexión con el servidor', async () => {
    await setup();
    type('email', 'ana@taskflow.ec');
    type('password', 'secreta123');

    await submit();
    response.error(new HttpErrorResponse({ status: 0 }));
    await fixture.whenStable();

    expect(alert()).toBe('No se pudo conectar con el servidor');
  });

  it('muestra el aviso de sesión expirada', async () => {
    await setup('Tu sesión expiró, inicia sesión de nuevo');

    expect(alert()).toBe('Tu sesión expiró, inicia sesión de nuevo');
  });

  it('enlaza al registro', async () => {
    await setup();

    expect(root.querySelector('a[href="/registro"]')).not.toBeNull();
  });
});
