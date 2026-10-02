import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { STATUS_LABELS, TASK_STATUSES, Task, TaskInput, TaskStatus } from '../../models/task';
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

function sortedNames(names: Iterable<string>): string[] {
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

@Component({
  selector: 'app-board',
  imports: [TaskForm, TaskCard],
  templateUrl: './board.html',
  styleUrl: './board.css',
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

  protected readonly columns = computed(() =>
    TASK_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      tasks: this.tasks().filter((task) => task.status === status),
    })),
  );

  constructor() {
    this.load();
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
    this.taskService.list(assignee || undefined).subscribe({
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

  /** Agrega la tarea al tablero solo si cumple el filtro de responsable activo. */
  private show(task: Task): void {
    const filter = this.assignee().toLowerCase();
    if (!filter || task.assignee?.toLowerCase() === filter) {
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
