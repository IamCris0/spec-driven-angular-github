import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { BackupFile, parseBackup } from '../../models/backup';
import { todayLocal } from '../../models/task';
import { BackupService } from '../../services/backup.service';

// Mismo límite que la API para las rutas /backup.
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const tasks = (count: number) => `${count} ${count === 1 ? 'tarea' : 'tareas'}`;

function importSummary(imported: number, skipped: number): string {
  if (imported === 0) {
    return skipped === 1
      ? 'No se importó nada: la tarea ya existía'
      : `No se importó nada: las ${skipped} tareas ya existían`;
  }
  const done = imported === 1 ? 'Se importó 1 tarea' : `Se importaron ${tasks(imported)}`;
  if (skipped === 0) {
    return done;
  }
  return skipped === 1
    ? `${done} y se omitió 1 que ya existía`
    : `${done} y se omitieron ${skipped} que ya existían`;
}

/** Descargar e importar las tareas en JSON (specs/003-respaldos-validaciones, H17 y H18). */
@Component({
  selector: 'app-backup',
  imports: [DatePipe],
  templateUrl: './backup.html',
})
export class Backup {
  private readonly backupService = inject(BackupService);

  protected readonly exporting = signal(false);
  protected readonly importing = signal(false);
  protected readonly pending = signal<BackupFile | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly tasks = tasks;

  protected download(): void {
    this.exporting.set(true);
    this.error.set(null);
    this.backupService.export().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `taskflow-respaldo-${todayLocal()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(
          error.status === 0
            ? 'No se pudo conectar con el servidor'
            : 'No se pudo descargar el respaldo',
        );
        this.exporting.set(false);
      },
    });
  }

  protected async choose(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.pending.set(null);
    this.error.set(null);
    this.success.set(null);
    if (!file) {
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.error.set('El archivo supera los 2 MB');
      return;
    }

    const result = parseBackup(await file.text());
    if ('error' in result) {
      this.error.set(result.error);
    } else {
      this.pending.set(result.backup);
    }
  }

  protected import(input: HTMLInputElement): void {
    const backup = this.pending();
    if (!backup || this.importing()) {
      return;
    }

    this.importing.set(true);
    this.error.set(null);
    this.backupService.import(backup).subscribe({
      next: ({ imported, skipped }) => {
        this.success.set(importSummary(imported, skipped));
        this.pending.set(null);
        this.importing.set(false);
        input.value = '';
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(
          error.status === 0
            ? 'No se pudo conectar con el servidor'
            : (error.error?.error ?? 'Ocurrió un error inesperado'),
        );
        this.importing.set(false);
      },
    });
  }
}
