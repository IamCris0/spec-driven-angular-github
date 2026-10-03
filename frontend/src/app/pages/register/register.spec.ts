import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let root: HTMLElement;
  let response: Subject<User>;
  let auth: { register: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  const type = (name: string, value: string) => {
    const input = root.querySelector<HTMLInputElement>(`[formcontrolname="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  async function fill(values: Partial<Record<string, string>> = {}) {
    const data = {
      name: 'Ana Torres',
      email: 'ana@taskflow.ec',
      password: 'secreta123',
      confirm: 'secreta123',
      ...values,
    };
    Object.entries(data).forEach(([name, value]) => type(name, value!));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    response = new Subject<User>();
    auth = { register: vi.fn(() => response) };
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Register);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  it.each([
    ['falta el nombre', { name: '  ' }, 'El nombre es obligatorio'],
    ['el correo no es válido', { email: 'ana@' }, 'El correo no es válido'],
    [
      'la contraseña es corta',
      { password: '1234567', confirm: '1234567' },
      'La contraseña debe tener al menos 8 caracteres',
    ],
    ['las contraseñas no coinciden', { confirm: 'otra-clave' }, 'Las contraseñas no coinciden'],
  ])('no envía el formulario cuando %s', async (_caso, values, message) => {
    await fill(values);

    expect(root.textContent).toContain(message);
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('crea la cuenta y va al tablero', async () => {
    await fill({ name: '  Ana Torres ', email: ' ana@taskflow.ec ' });
    response.next({ id: 1, name: 'Ana Torres', email: 'ana@taskflow.ec', created_at: '' });
    response.complete();
    await fixture.whenStable();

    expect(auth.register).toHaveBeenCalledWith('Ana Torres', 'ana@taskflow.ec', 'secreta123');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('muestra el error de la API, por ejemplo un correo repetido', async () => {
    await fill();
    response.error(
      new HttpErrorResponse({
        status: 409,
        error: { error: 'Ya existe una cuenta con ese correo' },
      }),
    );
    await fixture.whenStable();

    expect(root.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Ya existe una cuenta con ese correo',
    );
  });

  it('enlaza al inicio de sesión', () => {
    expect(root.querySelector('a[href="/login"]')).not.toBeNull();
  });
});
