import { Routes } from '@angular/router';
import { Board } from './components/board/board';
import { authGuard, guestGuard } from './guards/auth.guard';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

export const routes: Routes = [
  { path: '', component: Board, canActivate: [authGuard], title: 'Tablero · TaskFlow' },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
    title: 'Iniciar sesión · TaskFlow',
  },
  {
    path: 'registro',
    component: Register,
    canActivate: [guestGuard],
    title: 'Crear cuenta · TaskFlow',
  },
  { path: '**', redirectTo: '' },
];
