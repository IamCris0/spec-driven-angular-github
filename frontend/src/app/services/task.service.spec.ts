import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Comment, Stats, Task, TaskInput } from '../models/task';
import { TaskService } from './task.service';

const API_URL = 'http://localhost:3000/api';

const task: Task = {
  id: 1,
  title: 'Configurar CI',
  description: null,
  status: 'pendiente',
  priority: 'media',
  assignee: null,
  created_at: '2026-09-29T12:00:00.000Z',
  updated_at: '2026-09-29T12:00:00.000Z',
  created_by: 1,
  created_by_name: 'Ana Torres',
  due_date: null,
  comment_count: 0,
};

describe('TaskService', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('list', () => {
    it('pide todas las tareas con GET /tasks', async () => {
      const result = firstValueFrom(service.list());

      const req = http.expectOne(`${API_URL}/tasks`);
      expect(req.request.method).toBe('GET');
      req.flush([task]);

      expect(await result).toEqual([task]);
    });

    it('filtra por responsable con ?assignee= y codifica el valor en la URL', async () => {
      const result = firstValueFrom(service.list('Ana María'));

      const req = http.expectOne(`${API_URL}/tasks?assignee=Ana%20Mar%C3%ADa`);
      expect(req.request.method).toBe('GET');
      req.flush([]);

      expect(await result).toEqual([]);
    });

    it('no envía el filtro cuando el responsable está vacío', async () => {
      const result = firstValueFrom(service.list(''));

      http.expectOne(`${API_URL}/tasks`).flush([task]);

      expect(await result).toEqual([task]);
    });
  });

  it('obtiene una tarea con GET /tasks/:id', async () => {
    const result = firstValueFrom(service.get(1));

    const req = http.expectOne(`${API_URL}/tasks/1`);
    expect(req.request.method).toBe('GET');
    req.flush(task);

    expect(await result).toEqual(task);
  });

  it('crea una tarea con POST /tasks', async () => {
    const input: TaskInput = { title: 'Configurar CI', priority: 'alta', assignee: 'Ana' };
    const created: Task = { ...task, priority: 'alta', assignee: 'Ana' };
    const result = firstValueFrom(service.create(input));

    const req = http.expectOne(`${API_URL}/tasks`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(created, { status: 201, statusText: 'Created' });

    expect(await result).toEqual(created);
  });

  it('edita una tarea con PUT /tasks/:id', async () => {
    const input: TaskInput = { title: 'Configurar el pipeline', description: 'Con GitHub Actions' };
    const updated: Task = { ...task, ...input };
    const result = firstValueFrom(service.update(1, input));

    const req = http.expectOne(`${API_URL}/tasks/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(input);
    req.flush(updated);

    expect(await result).toEqual(updated);
  });

  it('cambia solo el estado con PATCH /tasks/:id/status', async () => {
    const moved: Task = { ...task, status: 'en_progreso' };
    const result = firstValueFrom(service.updateStatus(1, 'en_progreso'));

    const req = http.expectOne(`${API_URL}/tasks/1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'en_progreso' });
    req.flush(moved);

    expect(await result).toEqual(moved);
  });

  it('elimina una tarea con DELETE /tasks/:id', async () => {
    const result = firstValueFrom(service.delete(1));

    const req = http.expectOne(`${API_URL}/tasks/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await result; // La respuesta 204 no tiene cuerpo: basta con que termine sin error.
  });

  it('propaga el error de la API para que la interfaz pueda mostrarlo', async () => {
    const result = firstValueFrom(service.create({ title: '' }));

    http
      .expectOne(`${API_URL}/tasks`)
      .flush({ error: 'El título es obligatorio' }, { status: 400, statusText: 'Bad Request' });

    await expect(result).rejects.toMatchObject({
      status: 400,
      error: { error: 'El título es obligatorio' },
    });
  });

  describe('búsqueda, comentarios y estadísticas', () => {
    it('combina el filtro por responsable y la búsqueda', () => {
      service.list('Ana', 'pipe line').subscribe();

      http.expectOne(`${API_URL}/tasks?assignee=Ana&q=pipe%20line`).flush([]);
    });

    it('busca sin filtro de responsable', () => {
      service.list(undefined, 'ci').subscribe();

      http.expectOne(`${API_URL}/tasks?q=ci`).flush([]);
    });

    it('no envía una búsqueda vacía', () => {
      service.list('', '   ').subscribe();

      http.expectOne(`${API_URL}/tasks`).flush([]);
    });

    it('envía la fecha límite al crear', () => {
      service.create({ title: 'Con fecha', due_date: '2026-10-31' }).subscribe();

      const req = http.expectOne(`${API_URL}/tasks`);
      expect(req.request.body).toEqual({ title: 'Con fecha', due_date: '2026-10-31' });
      req.flush(task);
    });

    it('lista los comentarios de una tarea', async () => {
      const comments: Comment[] = [
        {
          id: 1,
          task_id: 1,
          user_id: 1,
          user_name: 'Ana',
          body: 'Hola',
          created_at: '2026-10-03T10:00:00.000Z',
        },
      ];
      const result = firstValueFrom(service.comments(1));

      const req = http.expectOne(`${API_URL}/tasks/1/comments`);
      expect(req.request.method).toBe('GET');
      req.flush(comments);

      expect(await result).toEqual(comments);
    });

    it('agrega un comentario', () => {
      service.addComment(1, '¿Lo reviso?').subscribe();

      const req = http.expectOne(`${API_URL}/tasks/1/comments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ body: '¿Lo reviso?' });
      req.flush({});
    });

    it('obtiene las estadísticas', async () => {
      const stats: Stats = {
        total: 1,
        byStatus: { pendiente: 1, en_progreso: 0, hecha: 0 },
        overdue: 0,
        byAssignee: [{ assignee: 'Ana', total: 1, done: 0 }],
      };
      const result = firstValueFrom(service.stats());

      http.expectOne(`${API_URL}/stats`).flush(stats);

      expect(await result).toEqual(stats);
    });
  });
});
