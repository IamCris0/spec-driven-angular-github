import { Task, isOverdue, sortTasks, todayLocal } from './task';

const base: Task = {
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
};
const task = (overrides: Partial<Task>): Task => ({ ...base, ...overrides });

describe('todayLocal', () => {
  it('devuelve la fecha local en formato AAAA-MM-DD', () => {
    expect(todayLocal(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('isOverdue', () => {
  const today = '2026-10-03';

  it.each<[string, Partial<Task>, boolean]>([
    ['fecha pasada y pendiente', { due_date: '2026-10-02' }, true],
    ['fecha pasada y en progreso', { due_date: '2026-01-01', status: 'en_progreso' }, true],
    ['fecha pasada pero hecha', { due_date: '2026-10-02', status: 'hecha' }, false],
    ['vence hoy', { due_date: '2026-10-03' }, false],
    ['fecha futura', { due_date: '2026-12-31' }, false],
    ['sin fecha', { due_date: null }, false],
  ])('%s → %s', (_caso, overrides, expected) => {
    expect(isOverdue(task(overrides), today)).toBe(expected);
  });
});

describe('sortTasks', () => {
  const tasks = [
    task({ id: 1, title: 'A', priority: 'baja', due_date: null }),
    task({ id: 2, title: 'B', priority: 'alta', due_date: '2026-12-01' }),
    task({ id: 3, title: 'C', priority: 'media', due_date: '2026-10-05' }),
    task({ id: 4, title: 'D', priority: 'alta', due_date: null }),
  ];
  const titles = (list: Task[]) => list.map((t) => t.title);

  it('por creación conserva el orden de la API', () => {
    expect(titles(sortTasks(tasks, 'created'))).toEqual(['A', 'B', 'C', 'D']);
  });

  it('por prioridad pone alta, media y baja; a igual prioridad, el orden de creación', () => {
    expect(titles(sortTasks(tasks, 'priority'))).toEqual(['B', 'D', 'C', 'A']);
  });

  it('por fecha límite pone primero las más próximas y al final las que no tienen', () => {
    expect(titles(sortTasks(tasks, 'due'))).toEqual(['C', 'B', 'A', 'D']);
  });

  it('no modifica la lista original', () => {
    sortTasks(tasks, 'priority');

    expect(titles(tasks)).toEqual(['A', 'B', 'C', 'D']);
  });
});
