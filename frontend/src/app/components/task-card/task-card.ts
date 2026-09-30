import { Component, computed, input, output } from '@angular/core';
import { STATUS_LABELS, Task, TaskStatus } from '../../models/task';

/** A qué columnas puede pasar una tarea desde su estado actual. */
const MOVES: Record<TaskStatus, TaskStatus[]> = {
  pendiente: ['en_progreso'],
  en_progreso: ['pendiente', 'hecha'],
  hecha: ['en_progreso'],
};

@Component({
  selector: 'app-task-card',
  templateUrl: './task-card.html',
  styleUrl: './task-card.css',
})
export class TaskCard {
  readonly task = input.required<Task>();
  readonly move = output<{ id: number; status: TaskStatus }>();

  protected readonly targets = computed(() =>
    MOVES[this.task().status].map((status) => ({ status, label: STATUS_LABELS[status] })),
  );
}
