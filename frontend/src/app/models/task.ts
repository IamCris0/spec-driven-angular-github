export type TaskStatus = 'pendiente' | 'en_progreso' | 'hecha';

export type TaskPriority = 'baja' | 'media' | 'alta';

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
