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
}

/** Datos que el cliente envía para crear o editar una tarea. El estado se cambia aparte. */
export interface TaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assignee?: string | null;
}
