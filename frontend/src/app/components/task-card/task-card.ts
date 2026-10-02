import { Component, computed, input, output } from '@angular/core';
import { STATUS_LABELS, Task, TaskPriority, TaskStatus } from '../../models/task';

/** A qué columnas puede pasar una tarea desde su estado actual. */
const MOVES: Record<TaskStatus, TaskStatus[]> = {
  pendiente: ['en_progreso'],
  en_progreso: ['pendiente', 'hecha'],
  hecha: ['en_progreso'],
};

// Con variante dark: el borde gris del modo oscuro también pintaría el lado izquierdo.
const ACCENTS: Record<TaskPriority, string> = {
  alta: 'border-l-rose-500 dark:border-l-rose-500',
  media: 'border-l-amber-400 dark:border-l-amber-400',
  baja: 'border-l-emerald-500 dark:border-l-emerald-500',
};

const CHIPS: Record<TaskPriority, string> = {
  alta: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  media: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  baja: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

@Component({
  selector: 'app-task-card',
  templateUrl: './task-card.html',
})
export class TaskCard {
  readonly task = input.required<Task>();
  readonly move = output<{ id: number; status: TaskStatus }>();
  readonly edit = output<number>();
  readonly remove = output<number>();

  protected readonly accent = computed(() => ACCENTS[this.task().priority]);
  protected readonly chip = computed(() => CHIPS[this.task().priority]);

  protected readonly targets = computed(() =>
    MOVES[this.task().status].map((status) => ({ status, label: STATUS_LABELS[status] })),
  );
}
