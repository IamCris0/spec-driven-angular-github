import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  STATUS_LABELS,
  TASK_STATUSES,
  Task,
  TaskInput,
  TaskOrder,
  TaskStatus,
  sortTasks,
} from '../../models/task';
import { TaskService } from '../../services/task.service';
import { TaskCard } from '../task-card/task-card';
import { TaskForm } from '../task-form/task-form';

function errorMessage(error: HttpErrorResponse, notFound: string): string {
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor';
  }
  if (error.status === 404) {
    return notFound;
  }
  return error.error?.error ?? 'Ocurrió un error inesperado';
}

const TASK_GONE = 'La tarea ya no existe';

// Mismos colores por estado que la página de estadísticas (paleta validada para daltonismo).
const COLUMN_DOTS: Record<TaskStatus, string> = {
  pendiente: 'bg-indigo-500',
  en_progreso: 'bg-amber-500 dark:bg-orange-600',
  hecha: 'bg-emerald-600',
};

const SEARCH_DELAY_MS = 300;

function sortedNames(names: Iterable<string>): string[] {
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

@Component({
  selector: 'app-board',
  imports: [TaskForm, TaskCard, CdkDropListGroup, CdkDropList, CdkDrag],
  templateUrl: './board.html',
})
export class Board {
  private readonly taskService = inject(TaskService);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  /** Responsable elegido en el filtro; vacío muestra todas las tareas. */
  protected readonly assignee = signal('');
  /** Responsables conocidos, para que el selector no pierda opciones al filtrar. */
  protected readonly assignees = signal<string[]>([]);
  /** Texto buscado en título y descripción (H11). */
  protected readonly query = signal('');
  protected readonly order = signal<TaskOrder>('created');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly columns = computed(() =>
    TASK_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      dot: COLUMN_DOTS[status],
      tasks: sortTasks(
        this.tasks().filter((task) => task.status === status),
        this.order(),
      ),
    })),
  );

  constructor() {
    this.load();
  }

  protected emptyMessage(): string {
    if (this.query()) {
      return 'Ninguna tarea coincide con la búsqueda';
    }
    return this.assignee() ? 'No hay tareas para este responsable' : 'No hay tareas todavía';
  }

  /** Espera a que el usuario deje de escribir antes de consultar la API. */
  protected search(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.query.set(text.trim());
      this.load();
    }, SEARCH_DELAY_MS);
  }

  protected sortBy(order: string): void {
    this.order.set(order as TaskOrder);
  }

  /** Soltar una tarjeta en otra columna cambia su estado (H10). */
  protected drop(event: CdkDragDrop<TaskStatus, TaskStatus, Task>): void {
    if (event.previousContainer !== event.container) {
      this.move({ id: event.item.data.id, status: event.container.data });
    }
  }

  protected commented(id: number): void {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === id ? { ...task, comment_count: task.comment_count + 1 } : task,
      ),
    );
  }

  protected filterBy(assignee: string): void {
    this.assignee.set(assignee);
    this.editingId.set(null);
    this.load();
  }

  protected create(input: TaskInput): void {
    this.taskService.create(input).subscribe({
      next: (task) => {
        this.show(task);
        this.rememberAssignees([task]);
        this.error.set(null);
      },
      error: (error: HttpErrorResponse) => this.error.set(errorMessage(error, '')),
    });
  }

  protected update(id: number, input: TaskInput): void {
    this.taskService.update(id, input).subscribe({
      next: (updated) => {
        this.tasks.update((tasks) => tasks.filter((task) => task.id !== id));
        this.show(updated);
        this.rememberAssignees([updated]);
        this.editingId.set(null);
        this.error.set(null);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.discard(id);
        }
        this.error.set(errorMessage(error, TASK_GONE));
      },
    });
  }

  protected move(change: { id: number; status: TaskStatus }): void {
    this.taskService.updateStatus(change.id, change.status).subscribe({
      next: (updated) => {
        this.tasks.update((tasks) =>
          tasks.map((task) => (task.id === updated.id ? updated : task)),
        );
        this.error.set(null);
      },
      error: (error: HttpErrorResponse) => this.error.set(errorMessage(error, TASK_GONE)),
    });
  }

  protected remove(id: number): void {
    const task = this.tasks().find((candidate) => candidate.id === id);
    if (!task || !window.confirm(`¿Eliminar la tarea "${task.title}"?`)) {
      return;
    }

    this.taskService.delete(id).subscribe({
      next: () => {
        this.discard(id);
        this.error.set(null);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.discard(id);
        }
        this.error.set(errorMessage(error, TASK_GONE));
      },
    });
  }

  private load(): void {
    const assignee = this.assignee();
    this.taskService.list(assignee || undefined, this.query()).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loaded.set(true);
        this.error.set(null);
        if (assignee) {
          this.rememberAssignees(tasks);
        } else {
          this.assignees.set(sortedNames(this.namesOf(tasks)));
        }
      },
      error: (error: HttpErrorResponse) => this.error.set(errorMessage(error, '')),
    });
  }

  /** Agrega la tarea al tablero solo si cumple el filtro de responsable y la búsqueda activos. */
  private show(task: Task): void {
    const assignee = this.assignee().toLowerCase();
    const query = this.query().toLowerCase();
    const text = `${task.title} ${task.description ?? ''}`.toLowerCase();
    if (
      (!assignee || task.assignee?.toLowerCase() === assignee) &&
      (!query || text.includes(query))
    ) {
      this.tasks.update((tasks) => [...tasks, task]);
    }
  }

  private discard(id: number): void {
    this.tasks.update((tasks) => tasks.filter((task) => task.id !== id));
    if (this.editingId() === id) {
      this.editingId.set(null);
    }
  }

  private rememberAssignees(tasks: Task[]): void {
    this.assignees.update((known) => sortedNames([...known, ...this.namesOf(tasks)]));
  }

  private namesOf(tasks: Task[]): string[] {
    return tasks.map((task) => task.assignee).filter((name): name is string => !!name);
  }
}
