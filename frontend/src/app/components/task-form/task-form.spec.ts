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
    due_date: null,
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
    expect(root.querySelector('button[type="submit"]')?.textContent).toContain('Guardar cambios');
  });

  it('emite los datos editados y conserva los valores en el formulario', async () => {
    type(field('title'), 'Editada');
    type(field('assignee'), '');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(saved).toEqual([{ title: 'Editada', description: 'Detalle', priority: 'alta' }]);
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
