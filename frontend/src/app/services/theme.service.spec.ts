import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const html = document.documentElement;

  function create(prefersDark = false): ThemeService {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
    }));
    return TestBed.inject(ThemeService);
  }

  beforeEach(() => {
    localStorage.clear();
    html.classList.remove('dark');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('la primera vez usa la preferencia del sistema operativo', () => {
    const theme = create(true);

    expect(theme.dark()).toBe(true);
    expect(html.classList.contains('dark')).toBe(true);
  });

  it('usa el tema claro si el sistema no prefiere el oscuro', () => {
    const theme = create(false);

    expect(theme.dark()).toBe(false);
    expect(html.classList.contains('dark')).toBe(false);
  });

  it('alternar cambia la clase de <html> y guarda la elección', () => {
    const theme = create(false);

    theme.toggle();
    TestBed.tick();

    expect(theme.dark()).toBe(true);
    expect(html.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('taskflow.theme')).toBe('dark');

    theme.toggle();
    TestBed.tick();

    expect(html.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('taskflow.theme')).toBe('light');
  });

  it('la elección guardada tiene prioridad sobre la del sistema', () => {
    localStorage.setItem('taskflow.theme', 'light');

    const theme = create(true);

    expect(theme.dark()).toBe(false);
  });

  it('funciona aunque el navegador no tenga matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(TestBed.inject(ThemeService).dark()).toBe(false);
  });
});
