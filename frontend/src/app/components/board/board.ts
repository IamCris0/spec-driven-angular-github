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

  protected readonly columns = computed(() =>
    TASK_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      tasks: this.tasks().filter((task) => task.status === status),
    })),
  );

  constructor() {
    this.taskService.list().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loaded.set(true);
      },
      error: (error: HttpErrorResponse) => this.error.set(errorMessage(error, '')),
    });
  }

  protected create(input: TaskInput): void {
    this.taskService.create(input).subscribe({
      next: (task) => {
        this.tasks.update((tasks) => [...tasks, task]);
        this.error.set(null);
      },
      error: (error: HttpErrorResponse) => this.error.set(errorMessage(error, '')),
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
      error: (error: HttpErrorResponse) =>
        this.error.set(errorMessage(error, 'La tarea ya no existe')),
    });
  }
}
