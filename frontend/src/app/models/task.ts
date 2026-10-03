export const TASK_STATUSES = ['pendiente', 'en_progreso', 'hecha'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['baja', 'media', 'alta'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Nombre de cada estado como se muestra en las columnas del tablero. */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Por hacer',
  en_progreso: 'En progreso',
  hecha: 'Hecho',
};

/** Tarea tal como la devuelve la API: los nombres coinciden con las columnas de la tabla `tasks`. */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  /** Fecha ISO 8601 en UTC asignada por el servidor. */
  created_at: string;
  /** Fecha ISO 8601 en UTC; el servidor la actualiza en cada cambio. */
  updated_at: string;
  /** Usuario que creó la tarea; null en tareas de la versión 1. */
  created_by: number | null;
  created_by_name: string | null;
  /** Fecha límite AAAA-MM-DD. */
  due_date: string | null;
  comment_count: number;
}

/** Datos que el cliente envía para crear o editar una tarea. El estado se cambia aparte. */
export interface TaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assignee?: string | null;
  due_date?: string | null;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  body: string;
  created_at: string;
}

export interface Stats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  overdue: number;
  byAssignee: { assignee: string | null; total: number; done: number }[];
}

export type TaskOrder = 'created' | 'priority' | 'due';

/** Fecha local AAAA-MM-DD; las fechas límite se comparan con el día del usuario, no con UTC. */
export function todayLocal(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Vencida = fecha límite anterior a hoy y la tarea no está hecha (H9). */
export function isOverdue(task: Task, today: string): boolean {
  return task.due_date !== null && task.due_date < today && task.status !== 'hecha';
}

const PRIORITY_RANK: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 };

/** Ordena una copia; a igualdad conserva el orden de creación (el de la API). */
export function sortTasks(tasks: Task[], order: TaskOrder): Task[] {
  const compare: Record<TaskOrder, (a: Task, b: Task) => number> = {
    created: () => 0,
    priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    // Las tareas sin fecha van al final.
    due: (a, b) => (a.due_date ?? '9999-99-99').localeCompare(b.due_date ?? '9999-99-99'),
  };
  return [...tasks].sort(compare[order]);
}
