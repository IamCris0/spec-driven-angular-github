import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { User } from './models/user';
import { AuthService } from './services/auth.service';

describe('App', () => {
  const ana: User = { id: 1, name: 'Ana Torres', email: 'ana@taskflow.ec', created_at: '' };
  let auth: { user: ReturnType<typeof signal<User | null>>; logout: ReturnType<typeof vi.fn> };

  async function render(user: User | null) {
    auth = { user: signal(user), logout: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra el nombre de la aplicación', async () => {
    const root = await render(null);

    expect(root.textContent).toContain('TaskFlow');
  });

  it('con sesión muestra el usuario y permite cerrar sesión', async () => {
    const root = await render(ana);

    expect(root.textContent).toContain('Ana Torres');
    root.querySelector<HTMLButtonElement>('button[data-action="logout"]')!.click();
    expect(auth.logout).toHaveBeenCalled();
  });

  it('sin sesión no muestra el usuario ni el botón de cerrar sesión', async () => {
    const root = await render(null);

    expect(root.querySelector('button[data-action="logout"]')).toBeNull();
  });
});
