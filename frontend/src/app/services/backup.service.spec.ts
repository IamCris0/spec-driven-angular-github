import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BackupFile } from '../models/backup';
import { BackupService } from './backup.service';

const API_URL = 'http://localhost:3000/api';

describe('BackupService', () => {
  let service: BackupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BackupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('descarga el respaldo como Blob', async () => {
    const result = firstValueFrom(service.export());
    const req = http.expectOne(`${API_URL}/backup/export`);
    const blob = new Blob(['{}'], { type: 'application/json' });
    req.flush(blob);

    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(await result).toBe(blob);
  });

  it('envía el respaldo a importar y devuelve el resultado', async () => {
    const backup: BackupFile = {
      format: 'taskflow-backup',
      version: 1,
      exported_at: '2026-10-10T17:00:00.000Z',
      exported_by: 'Ana Torres',
      tasks: [{ title: 'Uno' }],
    };
    const result = firstValueFrom(service.import(backup));
    const req = http.expectOne(`${API_URL}/backup/import`);
    req.flush({ imported: 1, skipped: 0 }, { status: 201, statusText: 'Created' });

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(backup);
    expect(await result).toEqual({ imported: 1, skipped: 0 });
  });
});
