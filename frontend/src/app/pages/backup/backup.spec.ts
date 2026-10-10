import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { BackupFile, ImportResult } from '../../models/backup';
import { todayLocal } from '../../models/task';
import { BackupService } from '../../services/backup.service';
import { Backup } from './backup';

const BACKUP: BackupFile = {
  format: 'taskflow-backup',
  version: 1,
  exported_at: '2026-10-10T17:00:00.000Z',
  exported_by: 'Ana Torres',
  tasks: [{ title: 'Uno' }, { title: 'Dos' }, { title: 'Tres' }],
};

describe('Backup', () => {
  let fixture: ComponentFixture<Backup>;
  let root: HTMLElement;
  let exported: Subject<Blob>;
  let imported: Subject<ImportResult>;
  let service: { export: ReturnType<typeof vi.fn>; import: ReturnType<typeof vi.fn> };

  const button = (action: string) =>
    root.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`);
  const alert = () => root.querySelector('[role="alert"]')?.textContent?.trim();
  const status = () => root.querySelector('[role="status"]')?.textContent?.trim();

  async function choose(content: string, name = 'respaldo.json', size?: number): Promise<void> {
    const file = new File([content], name, { type: 'application/json' });
    if (size !== undefined) {
      Object.defineProperty(file, 'size', { value: size });
    }
    const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    // Leer el archivo es asíncrono.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    exported = new Subject<Blob>();
    imported = new Subject<ImportResult>();
    service = { export: vi.fn(() => exported), import: vi.fn(() => imported) };
    await TestBed.configureTestingModule({
      imports: [Backup],
      providers: [{ provide: BackupService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(Backup);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('descargar (H17)', () => {
    it('descarga el archivo con la fecha de hoy en el nombre', async () => {
      const createObjectURL = vi.fn(() => 'blob:respaldo');
      const revokeObjectURL = vi.fn();
      Object.assign(URL, { createObjectURL, revokeObjectURL });
      let downloaded = '';
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        downloaded = this.download;
      });

      button('export')!.click();
      await fixture.whenStable();
      expect(button('export')!.disabled).toBe(true);
      const blob = new Blob(['{}']);
      exported.next(blob);
      exported.complete();
      await fixture.whenStable();

      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(downloaded).toBe(`taskflow-respaldo-${todayLocal()}.json`);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:respaldo');
      expect(button('export')!.disabled).toBe(false);
    });

    it('avisa si el servidor no responde', async () => {
      button('export')!.click();
      exported.error(new HttpErrorResponse({ status: 0 }));
      await fixture.whenStable();

      expect(alert()).toBe('No se pudo conectar con el servidor');
    });

    it('muestra un error genérico si la descarga falla', async () => {
      button('export')!.click();
      exported.error(new HttpErrorResponse({ status: 500 }));
      await fixture.whenStable();

      expect(alert()).toBe('No se pudo descargar el respaldo');
    });
  });

  describe('importar (H18)', () => {
    it('muestra cuántas tareas tiene el archivo antes de importar', async () => {
      await choose(JSON.stringify(BACKUP));

      expect(root.querySelector('[data-preview]')?.textContent).toContain('3 tareas');
      expect(root.querySelector('[data-preview]')?.textContent).toContain('Ana Torres');
      expect(button('import')?.textContent).toContain('Importar 3 tareas');
      expect(service.import).not.toHaveBeenCalled();
    });

    it.each([
      ['no es JSON', '{ roto', 'El archivo no es un JSON válido'],
      ['no es un respaldo', '{"a": 1}', 'El archivo no es un respaldo de TaskFlow'],
    ])('rechaza un archivo que %s', async (_caso, content, message) => {
      await choose(content);

      expect(alert()).toBe(message);
      expect(button('import')).toBeNull();
    });

    it('rechaza archivos de más de 2 MB sin leerlos', async () => {
      await choose(JSON.stringify(BACKUP), 'grande.json', 3 * 1024 * 1024);

      expect(alert()).toBe('El archivo supera los 2 MB');
      expect(button('import')).toBeNull();
    });

    it('importa y resume el resultado', async () => {
      await choose(JSON.stringify(BACKUP));

      button('import')!.click();
      await fixture.whenStable();
      expect(service.import).toHaveBeenCalledWith(BACKUP);
      expect(button('import')!.disabled).toBe(true);
      imported.next({ imported: 2, skipped: 1 });
      imported.complete();
      await fixture.whenStable();

      expect(status()).toBe('Se importaron 2 tareas y se omitieron 1 que ya existían');
      expect(button('import')).toBeNull();
    });

    it('usa el singular cuando corresponde', async () => {
      await choose(JSON.stringify({ ...BACKUP, tasks: [{ title: 'Una' }] }));

      expect(button('import')?.textContent).toContain('Importar 1 tarea');
      button('import')!.click();
      imported.next({ imported: 1, skipped: 0 });
      imported.complete();
      await fixture.whenStable();

      expect(status()).toBe('Se importó 1 tarea');
    });

    it('muestra el error de la API y permite reintentar', async () => {
      await choose(JSON.stringify(BACKUP));

      button('import')!.click();
      imported.error(
        new HttpErrorResponse({
          status: 400,
          error: { error: 'La tarea 2 no es válida: El título es obligatorio' },
        }),
      );
      await fixture.whenStable();

      expect(alert()).toBe('La tarea 2 no es válida: El título es obligatorio');
      expect(button('import')!.disabled).toBe(false);
    });
  });

  it('explica cómo restaurar la copia completa de la base', () => {
    expect(root.textContent).toContain('npm run restore');
  });
});
