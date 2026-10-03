import { Board } from './components/board/board';
import { authGuard, guestGuard } from './guards/auth.guard';
import { routes } from './app.routes';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Stats } from './pages/stats/stats';

describe('rutas', () => {
  const route = (path: string) => routes.find((candidate) => candidate.path === path);

  it.each([
    ['', Board],
    ['estadisticas', Stats],
  ])('"/%s" muestra su pantalla y exige sesión', (path, component) => {
    expect(route(path)?.component).toBe(component);
    expect(route(path)?.canActivate).toEqual([authGuard]);
  });

  it.each([
    ['login', Login],
    ['registro', Register],
  ])('"/%s" solo se ve sin sesión', (path, component) => {
    expect(route(path)?.component).toBe(component);
    expect(route(path)?.canActivate).toEqual([guestGuard]);
  });

  it('cualquier otra ruta lleva al tablero y va al final', () => {
    expect(routes.at(-1)).toEqual({ path: '**', redirectTo: '' });
  });
});
