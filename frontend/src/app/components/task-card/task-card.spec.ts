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
