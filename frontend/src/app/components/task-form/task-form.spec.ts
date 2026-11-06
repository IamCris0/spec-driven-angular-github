import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Task, TaskInput } from '../../models/task';
import { TaskForm } from './task-form';

function type(element: Element | null, value: string): void {
  const control = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  control.value = value;
  control.dispatchEvent(new Event('input'));
  control.dispatchEvent(new Event('change'));
}

describe('TaskForm', () => {
  let fixture: ComponentFixture<TaskForm>;
  let root: HTMLElement;
  let saved: TaskInput[];

  const field = (name: string) => root.querySelector(`[formcontrolname="${name}"]`);
  const error = () => root.querySelector('[data-error="title"]')?.textContent?.trim();

  async function submit(): Promise<void> {
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TaskForm] }).compileComponents();
    fixture = TestBed.createComponent(TaskForm);
    root = fixture.nativeElement;
    saved = [];
    fixture.componentInstance.saved.subscribe((task) => saved.push(task));
    await fixture.whenStable();
  });

  it('muestra "El título es obligatorio" y no guarda si el título está vacío', async () => {
    await submit();

    expect(error()).toBe('El título es obligatorio');
    expect(saved).toEqual([]);
  });

  it('trata un título de solo espacios como vacío', async () => {
    type(field('title'), '   ');
    await submit();

    expect(error()).toBe('El título es obligatorio');
    expect(saved).toEqual([]);
  });

  it('rechaza un título de más de 120 caracteres con un mensaje claro', async () => {
    type(field('title'), 'a'.repeat(121));
    await submit();

    expect(error()).toBe('El título no puede superar los 120 caracteres');
    expect(saved).toEqual([]);
  });

  it('emite solo el título y la prioridad por defecto cuando el resto está vacío', async () => {
    type(field('title'), 'Configurar CI');
    await submit();

    expect(saved).toEqual([{ title: 'Configurar CI', priority: 'media' }]);
  });

  it('emite todos los campos y recorta los espacios', async () => {
    type(field('title'), '  Revisar PR ');
    type(field('description'), 'Del compañero');
    type(field('priority'), 'alta');
    type(field('assignee'), ' Ana ');
    await submit();

    expect(saved).toEqual([
      { title: 'Revisar PR', description: 'Del compañero', priority: 'alta', assignee: 'Ana' },
    ]);
  });

  it('incluye la fecha límite cuando se indica', async () => {
    type(field('title'), 'Con fecha');
    type(field('due_date'), '2026-10-31');
    await submit();

    expect(saved).toEqual([{ title: 'Con fecha', priority: 'media', due_date: '2026-10-31' }]);
  });

  it('limpia el formulario después de guardar', async () => {
    type(field('title'), 'Tarea');
    await submit();

    expect((field('title') as HTMLInputElement).value).toBe('');
    expect((field('priority') as HTMLSelectElement).value).toBe('media');
    expect(error()).toBeUndefined();
  });
});

describe('TaskForm en modo edición', () => {
  const task: Task = {
    id: 5,
    title: 'Original',
    description: 'Detalle',
    status: 'en_progreso',
    priority: 'alta',
    assignee: 'Ana',
    created_at: '2026-09-29T12:00:00.000Z',
    updated_at: '2026-09-29T12:00:00.000Z',
    created_by: 1,
    created_by_name: 'Ana Torres',
    due_date: '2026-11-15',
    comment_count: 0,
  };
  let fixture: ComponentFixture<TaskForm>;
  let root: HTMLElement;
  let saved: TaskInput[];
  let cancelled: number;

  const field = (name: string) => root.querySelector(`[formcontrolname="${name}"]`);
  const value = (name: string) => (field(name) as HTMLInputElement).value;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TaskForm] }).compileComponents();
    fixture = TestBed.createComponent(TaskForm);
    root = fixture.nativeElement;
    saved = [];
    cancelled = 0;
    fixture.componentInstance.saved.subscribe((input) => saved.push(input));
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    fixture.componentRef.setInput('task', task);
    await fixture.whenStable();
  });

  it('carga los datos de la tarea y ofrece guardar los cambios', () => {
    expect(value('title')).toBe('Original');
    expect(value('description')).toBe('Detalle');
    expect(value('priority')).toBe('alta');
    expect(value('assignee')).toBe('Ana');
    expect(value('due_date')).toBe('2026-11-15');
    expect(root.querySelector('button[type="submit"]')?.textContent).toContain('Guardar cambios');
  });

  it('emite los datos editados y conserva los valores en el formulario', async () => {
    type(field('title'), 'Editada');
    type(field('assignee'), '');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(saved).toEqual([
      { title: 'Editada', description: 'Detalle', priority: 'alta', due_date: '2026-11-15' },
    ]);
    expect(value('title')).toBe('Editada');
  });

  it('valida el título igual que al crear', async () => {
    type(field('title'), '');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(root.querySelector('[data-error="title"]')?.textContent).toContain(
      'El título es obligatorio',
    );
    expect(saved).toEqual([]);
  });

  it('emite cancelled al pulsar Cancelar', () => {
    root.querySelector<HTMLButtonElement>('button[data-action="cancel"]')!.click();

    expect(cancelled).toBe(1);
  });
});

describe('TaskForm al crear', () => {
  it('no muestra el botón Cancelar', async () => {
    await TestBed.configureTestingModule({ imports: [TaskForm] }).compileComponents();
    const fixture = TestBed.createComponent(TaskForm);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('button[data-action="cancel"]')).toBeNull();
  });
});

// Validaciones de specs/003-respaldos-validaciones (H19): mismos mensajes que la API.
describe('TaskForm: validaciones de la v3', () => {
  let fixture: ComponentFixture<TaskForm>;
  let root: HTMLElement;
  let saved: TaskInput[];

  const field = (name: string) => root.querySelector(`[formcontrolname="${name}"]`);
  const error = (name: string) => root.querySelector(`[data-error="${name}"]`)?.textContent?.trim();

  async function submitWith(values: Record<string, string>): Promise<void> {
    type(field('title'), 'Tarea');
    Object.entries(values).forEach(([name, value]) => type(field(name), value));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TaskForm] }).compileComponents();
    fixture = TestBed.createComponent(TaskForm);
    root = fixture.nativeElement;
    saved = [];
    fixture.componentInstance.saved.subscribe((task) => saved.push(task));
    await fixture.whenStable();
  });

  it.each([
    ['description', 'd'.repeat(1001), 'La descripción no puede superar los 1000 caracteres'],
    ['assignee', 'r'.repeat(61), 'El responsable no puede superar los 60 caracteres'],
    ['due_date', '1999-12-31', 'La fecha límite debe estar entre los años 2000 y 2099'],
    ['due_date', '2100-01-01', 'La fecha límite debe estar entre los años 2000 y 2099'],
  ])('rechaza un valor fuera de rango en %s (caso %#)', async (name, value, message) => {
    await submitWith({ [name]: value });

    expect(error(name)).toBe(message);
    expect(saved).toEqual([]);
  });

  it('rechaza un año de cinco cifras con el mismo mensaje que la API', async () => {
    // Los navegadores permiten escribir años de 5 cifras; como texto, "20000-01-01" < "2099-12-31".
    type(field('title'), 'Tarea');
    fixture.componentInstance['form'].controls.due_date.setValue('20000-01-01');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(error('due_date')).toBe('La fecha límite no es válida');
    expect(saved).toEqual([]);
  });

  it('acepta los valores límite', async () => {
    await submitWith({
      description: 'd'.repeat(1000),
      assignee: 'r'.repeat(60),
      due_date: '2099-12-31',
    });

    expect(saved).toHaveLength(1);
    expect(error('description')).toBeUndefined();
  });

  it('muestra cuántos caracteres lleva la descripción', async () => {
    type(field('description'), 'Hola');
    await fixture.whenStable();

    expect(root.querySelector('[data-counter="description"]')?.textContent?.trim()).toBe('4/1000');
  });

  it('limita el selector de fecha a los años 2000-2099', () => {
    const date = field('due_date') as HTMLInputElement;

    expect(date.min).toBe('2000-01-01');
    expect(date.max).toBe('2099-12-31');
  });
});
