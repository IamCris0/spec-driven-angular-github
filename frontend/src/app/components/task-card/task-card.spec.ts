import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Task, TaskStatus } from '../../models/task';
import { TaskCard } from './task-card';

const task: Task = {
  id: 7,
  title: 'Configurar CI',
  description: 'Con GitHub Actions',
  status: 'pendiente',
  priority: 'alta',
  assignee: 'Ana',
  created_at: '2026-09-29T12:00:00.000Z',
  updated_at: '2026-09-29T12:00:00.000Z',
  created_by: 1,
  created_by_name: 'Ana Torres',
  due_date: null,
  comment_count: 0,
};

describe('TaskCard', () => {
  let fixture: ComponentFixture<TaskCard>;
  let root: HTMLElement;

  async function render(overrides: Partial<Task> = {}): Promise<void> {
    fixture.componentRef.setInput('task', { ...task, ...overrides });
    await fixture.whenStable();
  }

  const targets = () =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-move]')).map(
      (button) => button.dataset['move'],
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TaskCard] }).compileComponents();
    fixture = TestBed.createComponent(TaskCard);
    root = fixture.nativeElement;
  });

  it('muestra el título, la descripción, la prioridad y el responsable', async () => {
    await render();

    const text = root.textContent!;
    expect(text).toContain('Configurar CI');
    expect(text).toContain('Con GitHub Actions');
    expect(text).toContain('alta');
    expect(text).toContain('Ana');
  });

  it('no muestra descripción ni responsable cuando no existen', async () => {
    await render({ description: null, assignee: null });

    expect(root.querySelector('[data-field="description"]')).toBeNull();
    expect(root.querySelector('[data-field="assignee"]')).toBeNull();
  });

  it.each<[TaskStatus, string[]]>([
    ['pendiente', ['en_progreso']],
    ['en_progreso', ['pendiente', 'hecha']],
    ['hecha', ['en_progreso']],
  ])('desde %s ofrece mover a %j', async (status, expected) => {
    await render({ status });

    expect(targets()).toEqual(expected);
  });

  it('emite el nuevo estado al pulsar un botón de mover', async () => {
    await render({ status: 'en_progreso' });
    const moves: { id: number; status: TaskStatus }[] = [];
    fixture.componentInstance.move.subscribe((event) => moves.push(event));

    root.querySelector<HTMLButtonElement>('button[data-move="hecha"]')!.click();

    expect(moves).toEqual([{ id: 7, status: 'hecha' }]);
  });

  it('emite edit con el id al pulsar Editar', async () => {
    await render();
    const edited: number[] = [];
    fixture.componentInstance.edit.subscribe((id) => edited.push(id));

    root.querySelector<HTMLButtonElement>('button[data-action="edit"]')!.click();

    expect(edited).toEqual([7]);
  });

  it('emite remove con el id al pulsar Eliminar', async () => {
    await render();
    const removed: number[] = [];
    fixture.componentInstance.remove.subscribe((id) => removed.push(id));

    root.querySelector<HTMLButtonElement>('button[data-action="delete"]')!.click();

    expect(removed).toEqual([7]);
  });
});

describe('TaskCard: fecha límite, autor y comentarios', () => {
  let fixture: ComponentFixture<TaskCard>;
  let root: HTMLElement;

  async function render(overrides: Partial<Task>): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TaskCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(TaskCard);
    root = fixture.nativeElement;
    fixture.componentRef.setInput('task', { ...task, ...overrides });
    await fixture.whenStable();
  }

  it('muestra la fecha límite en formato día/mes/año', async () => {
    await render({ due_date: '2099-10-31' });

    expect(root.querySelector('[data-field="due"]')?.textContent).toContain('31/10/2099');
    expect(root.querySelector('[data-overdue]')).toBeNull();
  });

  it('marca como vencida una tarea con fecha pasada que no está hecha', async () => {
    await render({ due_date: '2020-01-15', status: 'pendiente' });

    expect(root.querySelector('[data-overdue]')?.textContent).toContain('Vencida');
  });

  it('no marca como vencida una tarea hecha', async () => {
    await render({ due_date: '2020-01-15', status: 'hecha' });

    expect(root.querySelector('[data-overdue]')).toBeNull();
  });

  it('no muestra fecha si no tiene', async () => {
    await render({ due_date: null });

    expect(root.querySelector('[data-field="due"]')).toBeNull();
  });

  it('muestra quién creó la tarea', async () => {
    await render({ created_by_name: 'Luis Pérez' });

    expect(root.querySelector('[data-field="created-by"]')?.textContent).toContain('Luis Pérez');
  });

  it('muestra cuántos comentarios tiene y despliega el panel', async () => {
    await render({ comment_count: 3 });
    const toggle = root.querySelector<HTMLButtonElement>('button[data-action="comments"]')!;
    expect(toggle.textContent).toContain('3');
    expect(root.querySelector('app-task-comments')).toBeNull();

    toggle.click();
    await fixture.whenStable();

    expect(root.querySelector('app-task-comments')).not.toBeNull();
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/api/tasks/7/comments')
      .flush([]);
  });
});
