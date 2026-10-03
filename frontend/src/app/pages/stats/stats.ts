import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { STATUS_LABELS, Stats as StatsData, TASK_STATUSES, TaskStatus } from '../../models/task';
import { TaskService } from '../../services/task.service';

// Paleta validada (scripts/validate_palette.js de la guía de dataviz) en claro y oscuro; es la
// misma de los puntos de las columnas del tablero, así cada estado tiene un único color.
const STATUS_COLORS: Record<TaskStatus, string> = {
  pendiente: 'bg-indigo-500',
  en_progreso: 'bg-amber-500 dark:bg-orange-600',
  hecha: 'bg-emerald-600',
};

const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

/** Panel de estadísticas del avance del equipo (H13). */
@Component({
  selector: 'app-stats',
  templateUrl: './stats.html',
})
export class Stats {
  private readonly taskService = inject(TaskService);

  protected readonly data = signal<StatsData | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly donePercent = computed(() => {
    const data = this.data();
    return data ? percent(data.byStatus.hecha, data.total) : 0;
  });

  protected readonly segments = computed(() => {
    const data = this.data();
    return TASK_STATUSES.map((status) => {
      const count = data?.byStatus[status] ?? 0;
      return {
        status,
        label: STATUS_LABELS[status],
        color: STATUS_COLORS[status],
        count,
        percent: percent(count, data?.total ?? 0),
      };
    });
  });

  protected readonly people = computed(() =>
    (this.data()?.byAssignee ?? []).map((row) => ({
      name: row.assignee ?? 'Sin asignar',
      total: row.total,
      done: row.done,
      percent: percent(row.done, row.total),
    })),
  );

  constructor() {
    this.taskService.stats().subscribe({
      next: (data) => this.data.set(data),
      error: (error: HttpErrorResponse) =>
        this.error.set(
          error.status === 0
            ? 'No se pudo conectar con el servidor'
            : (error.error?.error ?? 'Ocurrió un error inesperado'),
        ),
    });
  }
}
