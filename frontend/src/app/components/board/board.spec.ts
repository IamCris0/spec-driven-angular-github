import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Task, TaskStatus } from '../../models/task';
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
    created_by: 1,
    created_by_name: 'Ana Torres',
    due_date: null,
    comment_count: 0,
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

    const title = root.querySelector<HTMLInputElement>('[formcontrolname="title"]')!;
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

    const title = root.querySelector<HTMLInputElement>('[formcontrolname="title"]')!;
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

  describe('editar y eliminar', () => {
    const editButton = (status = 'pendiente') =>
      column(status).querySelector<HTMLButtonElement>('button[data-action="edit"]')!;
    const deleteButton = (status = 'pendiente') =>
      column(status).querySelector<HTMLButtonElement>('button[data-action="delete"]')!;

    beforeEach(async () => {
      await open([makeTask({ id: 5, title: 'Original', assignee: 'Ana' })]);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('reemplaza la tarjeta por un formulario con los datos de la tarea', async () => {
      editButton().click();
      await fixture.whenStable();

      const form = column('pendiente').querySelector('form')!;
      expect(form).not.toBeNull();
      expect(form.querySelector<HTMLInputElement>('[formcontrolname="title"]')!.value).toBe(
        'Original',
      );
      expect(column('pendiente').querySelector('.task-card')).toBeNull();
    });

    it('guarda el nuevo título y el tablero lo muestra', async () => {
      editButton().click();
      await fixture.whenStable();
      const form = column('pendiente').querySelector('form')!;
      const title = form.querySelector<HTMLInputElement>('[formcontrolname="title"]')!;
      title.value = 'Título nuevo';
      title.dispatchEvent(new Event('input'));
      form.dispatchEvent(new Event('submit'));

      const req = http.expectOne(`${API_URL}/tasks/5`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        title: 'Título nuevo',
        priority: 'media',
        assignee: 'Ana',
      });
      req.flush(makeTask({ id: 5, title: 'Título nuevo', assignee: 'Ana' }));
      await fixture.whenStable();

      expect(titles('pendiente')).toEqual(['Título nuevo']);
      expect(column('pendiente').querySelector('form')).toBeNull();
    });

    it('cancelar la edición vuelve a mostrar la tarjeta sin llamar a la API', async () => {
      editButton().click();
      await fixture.whenStable();

      column('pendiente').querySelector<HTMLButtonElement>('button[data-action="cancel"]')!.click();
      await fixture.whenStable();

      expect(titles('pendiente')).toEqual(['Original']);
    });

    it('avisa y quita la tarea si al editarla ya no existe', async () => {
      editButton().click();
      await fixture.whenStable();
      column('pendiente').querySelector('form')!.dispatchEvent(new Event('submit'));
      http
        .expectOne(`${API_URL}/tasks/5`)
        .flush({ error: 'Tarea no encontrada' }, { status: 404, statusText: 'Not Found' });
      await fixture.whenStable();

      expect(alert()).toBe('La tarea ya no existe');
      expect(titles('pendiente')).toEqual([]);
    });

    it('pide confirmación y elimina la tarea', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

      deleteButton().click();

      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Original'));
      const req = http.expectOne(`${API_URL}/tasks/5`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();

      expect(titles('pendiente')).toEqual([]);
      expect(root.querySelector('.empty')?.textContent).toContain('No hay tareas todavía');
    });

    it('no elimina nada si el usuario no confirma', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      deleteButton().click();
      await fixture.whenStable();

      expect(titles('pendiente')).toEqual(['Original']);
    });

    it('avisa y quita la tarea si al eliminarla ya no existe', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      deleteButton().click();
      http
        .expectOne(`${API_URL}/tasks/5`)
        .flush({ error: 'Tarea no encontrada' }, { status: 404, statusText: 'Not Found' });
      await fixture.whenStable();

      expect(alert()).toBe('La tarea ya no existe');
      expect(titles('pendiente')).toEqual([]);
    });
  });

  describe('filtro por responsable', () => {
    const select = () => root.querySelector<HTMLSelectElement>('select[data-filter="assignee"]')!;
    const options = () => Array.from(select().options).map((option) => option.textContent?.trim());

    async function choose(value: string): Promise<void> {
      select().value = value;
      select().dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }

    beforeEach(async () => {
      await open([
        makeTask({ id: 1, title: 'De Ana', assignee: 'Ana' }),
        makeTask({ id: 2, title: 'De Luis', assignee: 'Luis' }),
        makeTask({ id: 3, title: 'Otra de Ana', assignee: 'Ana' }),
        makeTask({ id: 4, title: 'Sin responsable' }),
      ]);
    });

    it('ofrece Todos y cada responsable una sola vez', () => {
      expect(options()).toEqual(['Todos', 'Ana', 'Luis']);
    });

    it('pide a la API solo las tareas del responsable elegido', async () => {
      await choose('Ana');

      const req = http.expectOne(`${API_URL}/tasks?assignee=Ana`);
      req.flush([
        makeTask({ id: 1, title: 'De Ana', assignee: 'Ana' }),
        makeTask({ id: 3, title: 'Otra de Ana', assignee: 'Ana' }),
      ]);
      await fixture.whenStable();

      expect(titles('pendiente')).toEqual(['De Ana', 'Otra de Ana']);
      expect(options()).toEqual(['Todos', 'Ana', 'Luis']);
    });

    it('vuelve a pedir todas las tareas al elegir Todos', async () => {
      await choose('Ana');
      http.expectOne(`${API_URL}/tasks?assignee=Ana`).flush([]);
      await fixture.whenStable();

      await choose('');

      http.expectOne(`${API_URL}/tasks`).flush([makeTask({ id: 2, title: 'De Luis' })]);
      await fixture.whenStable();
      expect(titles('pendiente')).toEqual(['De Luis']);
    });

    it('explica que no hay tareas para el responsable si el resultado es vacío', async () => {
      await choose('Luis');
      http.expectOne(`${API_URL}/tasks?assignee=Luis`).flush([]);
      await fixture.whenStable();

      expect(root.querySelector('.empty')?.textContent).toContain(
        'No hay tareas para este responsable',
      );
    });

    it('no muestra una tarea nueva que no pertenece al responsable filtrado', async () => {
      await choose('Ana');
      http
        .expectOne(`${API_URL}/tasks?assignee=Ana`)
        .flush([makeTask({ id: 1, title: 'De Ana', assignee: 'Ana' })]);
      await fixture.whenStable();

      const title = root.querySelector<HTMLInputElement>('[formcontrolname="title"]')!;
      title.value = 'De Pedro';
      title.dispatchEvent(new Event('input'));
      const assignee = root.querySelector<HTMLInputElement>('[formcontrolname="assignee"]')!;
      assignee.value = 'Pedro';
      assignee.dispatchEvent(new Event('input'));
      root.querySelector('form')!.dispatchEvent(new Event('submit'));
      http
        .expectOne(`${API_URL}/tasks`)
        .flush(makeTask({ id: 9, title: 'De Pedro', assignee: 'Pedro' }), {
          status: 201,
          statusText: 'Created',
        });
      await fixture.whenStable();

      expect(titles('pendiente')).toEqual(['De Ana']);
      expect(options()).toEqual(['Todos', 'Ana', 'Luis', 'Pedro']);
    });
  });

  describe('búsqueda (H11)', () => {
    const search = () => root.querySelector<HTMLInputElement>('input[data-search]')!;

    afterEach(() => vi.useRealTimers());

    it('espera 300 ms tras escribir y pide a la API solo lo que coincide', async () => {
      await open([
        makeTask({ id: 1, title: 'Configurar pipeline' }),
        makeTask({ id: 2, title: 'Otra' }),
      ]);
      vi.useFakeTimers();

      search().value = 'pipe';
      search().dispatchEvent(new Event('input'));
      search().value = 'pipeline';
      search().dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(299);
      http.expectNone(`${API_URL}/tasks?q=pipeline`);
      vi.advanceTimersByTime(1);

      http
        .expectOne(`${API_URL}/tasks?q=pipeline`)
        .flush([makeTask({ id: 1, title: 'Configurar pipeline' })]);
      vi.useRealTimers();
      await fixture.whenStable();

      expect(titles('pendiente')).toEqual(['Configurar pipeline']);
    });

    it('explica cuando la búsqueda no encuentra tareas', async () => {
      await open([makeTask({ id: 1, title: 'Otra' })]);
      vi.useFakeTimers();

      search().value = 'nada';
      search().dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
      http.expectOne(`${API_URL}/tasks?q=nada`).flush([]);
      vi.useRealTimers();
      await fixture.whenStable();

      expect(root.querySelector('.empty')?.textContent).toContain(
        'Ninguna tarea coincide con la búsqueda',
      );
    });
  });

  describe('orden (H9)', () => {
    it('ordena cada columna por prioridad o por fecha límite', async () => {
      await open([
        makeTask({ id: 1, title: 'Baja sin fecha', priority: 'baja' }),
        makeTask({ id: 2, title: 'Alta tarde', priority: 'alta', due_date: '2099-12-01' }),
        makeTask({ id: 3, title: 'Media pronto', priority: 'media', due_date: '2099-01-01' }),
      ]);
      const sort = root.querySelector<HTMLSelectElement>('select[data-sort]')!;

      sort.value = 'priority';
      sort.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(titles('pendiente')).toEqual(['Alta tarde', 'Media pronto', 'Baja sin fecha']);

      sort.value = 'due';
      sort.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(titles('pendiente')).toEqual(['Media pronto', 'Alta tarde', 'Baja sin fecha']);
    });
  });

  describe('arrastrar y soltar (H10)', () => {
    function drop(task: Task, from: number, to: number): void {
      const lists = fixture.debugElement.queryAll(By.directive(CdkDropList));
      const list = (index: number) => lists[index].injector.get(CdkDropList);
      const event = {
        previousContainer: list(from),
        container: list(to),
        item: { data: task },
      } as unknown as CdkDragDrop<TaskStatus, TaskStatus, Task>;
      lists[to].triggerEventHandler('cdkDropListDropped', event);
    }

    it('soltar en otra columna cambia el estado con la API', async () => {
      const task = makeTask({ id: 5, title: 'Arrastrada' });
      await open([task]);

      drop(task, 0, 1);

      const req = http.expectOne(`${API_URL}/tasks/5/status`);
      expect(req.request.body).toEqual({ status: 'en_progreso' });
      req.flush({ ...task, status: 'en_progreso' });
      await fixture.whenStable();

      expect(titles('en_progreso')).toEqual(['Arrastrada']);
    });

    it('soltar en la misma columna no llama a la API', async () => {
      const task = makeTask({ id: 5, title: 'Quieta' });
      await open([task]);

      drop(task, 0, 0);

      http.expectNone(`${API_URL}/tasks/5/status`);
    });
  });

  describe('comentarios', () => {
    it('actualiza el contador de la tarjeta al agregar un comentario', async () => {
      await open([makeTask({ id: 5, title: 'Comentada', comment_count: 1 })]);
      const toggle = () => root.querySelector<HTMLButtonElement>('button[data-action="comments"]')!;

      toggle().click();
      await fixture.whenStable();
      http.expectOne(`${API_URL}/tasks/5/comments`).flush([]);
      await fixture.whenStable();
      const textarea = root.querySelector('app-task-comments textarea') as HTMLTextAreaElement;
      textarea.value = 'Nuevo';
      textarea.dispatchEvent(new Event('input'));
      root.querySelector('app-task-comments form')!.dispatchEvent(new Event('submit'));
      http.expectOne(`${API_URL}/tasks/5/comments`).flush({
        id: 9,
        task_id: 5,
        user_id: 1,
        user_name: 'Ana',
        body: 'Nuevo',
        created_at: '2026-10-03T10:00:00.000Z',
      });
      await fixture.whenStable();

      expect(toggle().textContent).toContain('2');
    });
  });
});
