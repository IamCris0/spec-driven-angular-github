import { TaskPriority, TaskStatus } from './task';

/** Tarea dentro de un respaldo JSON (specs/003-respaldos-validaciones, plan). */
export interface BackupTask {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string | null;
  due_date?: string | null;
  created_at?: string;
  created_by_name?: string | null;
  comments?: { author: string; body: string; created_at: string }[];
}

export interface BackupFile {
  format: 'taskflow-backup';
  version: 1;
  exported_at: string;
  exported_by: string;
  tasks: BackupTask[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

/**
 * Comprueba lo básico antes de enviar el archivo a la API, que valida cada tarea. Devuelve el respaldo o el
 * motivo por el que no lo es.
 */
export function parseBackup(text: string): { backup: BackupFile } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'El archivo no es un JSON válido' };
  }

  const candidate = data as Partial<BackupFile> | null;
  if (
    candidate === null ||
    typeof candidate !== 'object' ||
    candidate.format !== 'taskflow-backup' ||
    !Array.isArray(candidate.tasks)
  ) {
    return { error: 'El archivo no es un respaldo de TaskFlow' };
  }
  if (candidate.version !== 1) {
    return { error: 'La versión del respaldo no es compatible' };
  }
  return { backup: candidate as BackupFile };
}
