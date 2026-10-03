import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'taskflow.theme';

function initialDark(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved === 'dark';
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Modo oscuro: la elección del usuario se guarda; si no hay, se usa la del sistema. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(initialDark());

  constructor() {
    this.apply();
  }

  toggle(): void {
    this.dark.update((dark) => !dark);
    localStorage.setItem(STORAGE_KEY, this.dark() ? 'dark' : 'light');
    this.apply();
  }

  private apply(): void {
    document.documentElement.classList.toggle('dark', this.dark());
  }
}
