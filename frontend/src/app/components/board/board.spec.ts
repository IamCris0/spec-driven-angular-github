import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Task } from '../../models/task';
import { Board } from './board';

const API_URL = 'http://localhost:3000/api';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 1,
    title: 'Tarea',
    description: null,
    status: 'pendiente',
    priority: 'media',
    assignee: null,
    created_at: '2026-09-29T12:00:00.000Z',
    updated_at: '2026-09-29T12:00:00.000Z',
    ...overrides,
  };
}

describe('Board', () => {
  let fixture: ComponentFixture<Board>;
  let http: HttpTestingController;
  let root: HTMLElement;

  const column = (status: string) => root.querySelector(`[data-status="${status}"]`)!;
  const titles = (status: string) =>
    Array.from(column(status).querySelectorAll('.task-card h3')).map((h) => h.textContent?.trim());
  const alert = () => root.querySelector('[role="alert"]')?.textContent?.trim();

  async function open(tasks: Task[]): Promise<void> {
    http.expectOne(`${API_URL}/tasks`).flush(tasks);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Board],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Board);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
  });

  it('muestra "No hay tareas todavía" cuando no hay tareas', async () => {
    await open([]);

    expect(root.querySelector('.empty')?.textContent).toContain('No hay tareas todavía');
  });

  it('agrupa las tareas en Por hacer, En progreso y Hecho', async () => {
    await open([
      makeTask({ id: 1, title: 'A', status: 'pendiente' }),
      makeTask({ id: 2, title: 'B', status: 'en_progreso' }),
      makeTask({ id: 3, title: 'C', status: 'hecha' }),
      makeTask({ id: 4, title: 'D', status: 'pendiente' }),
    ]);

    const headings = Array.from(root.querySelectorAll('section h2')).map((h) =>
      h.textContent?.trim(),
    );
    expect(headings).toEqual(['Por hacer', 'En progreso', 'Hecho']);
    expect(titles('pendiente')).toEqual(['A', 'D']);
    expect(titles('en_progreso')).toEqual(['B']);
    expect(titles('hecha')).toEqual(['C']);
    expect(root.querySelector('.empty')).toBeNull();
  });

  it('muestra "No se pudo conectar con el servidor" si la API no responde', async () => {
    http
      .expectOne(`${API_URL}/tasks`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();

    expect(alert()).toBe('No se pudo conectar con el servidor');
  });

  it('agrega la tarea nueva en Por hacer al guardar el formulario', async () => {
    await open([]);

    const title = root.querySelector<HTMLInputElement>('#title')!;
    title.value = 'Configurar CI';
    title.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));

    const req = http.expectOne(`${API_URL}/tasks`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Configurar CI', priority: 'media' });
    req.flush(makeTask({ id: 9, title: 'Configurar CI' }), { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(titles('pendiente')).toEqual(['Configurar CI']);
    expect(root.querySelector('.empty')).toBeNull();
  });

  it('muestra el mensaje de validación que devuelve la API al crear', async () => {
    await open([]);

    const title = root.querySelector<HTMLInputElement>('#title')!;
    title.value = 'Tarea';
    title.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    http
      .expectOne(`${API_URL}/tasks`)
      .flush({ error: 'El título es obligatorio' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(alert()).toBe('El título es obligatorio');
  });

  it('mueve la tarea de columna al cambiar su estado', async () => {
    await open([makeTask({ id: 5, title: 'Mover' })]);

    column('pendiente')
      .querySelector<HTMLButtonElement>('button[data-move="en_progreso"]')!
      .click();

    const req = http.expectOne(`${API_URL}/tasks/5/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'en_progreso' });
    req.flush(makeTask({ id: 5, title: 'Mover', status: 'en_progreso' }));
    await fixture.whenStable();

    expect(titles('pendiente')).toEqual([]);
    expect(titles('en_progreso')).toEqual(['Mover']);
  });

  it('avisa al usuario y deja la tarea donde estaba si ya no existe', async () => {
    await open([makeTask({ id: 5, title: 'Mover' })]);

    column('pendiente')
      .querySelector<HTMLButtonElement>('button[data-move="en_progreso"]')!
      .click();
    http
      .expectOne(`${API_URL}/tasks/5/status`)
      .flush({ error: 'Tarea no encontrada' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(alert()).toBe('La tarea ya no existe');
    expect(titles('pendiente')).toEqual(['Mover']);
  });
});
