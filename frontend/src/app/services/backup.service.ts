import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api';
import { BackupFile, ImportResult } from '../models/backup';

/** Cliente de las rutas /backup (contrato en specs/003-respaldos-validaciones/plan.md). */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly http = inject(HttpClient);
  private readonly backupUrl = `${API_URL}/backup`;

  export(): Observable<Blob> {
    return this.http.get(`${this.backupUrl}/export`, { responseType: 'blob' });
  }

  import(backup: BackupFile): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.backupUrl}/import`, backup);
  }
}
