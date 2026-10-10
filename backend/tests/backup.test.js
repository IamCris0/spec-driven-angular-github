const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const {
  backupConfig,
  backupFileName,
  createBackup,
  listBackups,
  pruneBackups,
  restoreBackup,
  startBackupSchedule,
  validateBackupFile,
} = require('../src/backup');
const { createDb, SCHEMA_VERSION } = require('../src/db');

// Respaldos de la base de datos (specs/003-respaldos-validaciones, H15 y H16).
describe('respaldos de la base de datos', () => {
  let dir;
  let db;

  const at = (iso) => new Date(iso);
  const names = () => fs.readdirSync(path.join(dir, 'backups')).sort();
  const backupsDir = () => path.join(dir, 'backups');

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-backup-'));
    db = createDb(path.join(dir, 'taskflow.db'));
    db.prepare('INSERT INTO tasks (title) VALUES (?)').run('Tarea original');
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('backupFileName', () => {
    it('usa la fecha ISO sin dos puntos ni puntos, para que el orden alfabético sea el cronológico', () => {
      expect(backupFileName('taskflow-', at('2026-10-10T17:05:03.123Z'))).toBe(
        'taskflow-2026-10-10T17-05-03-123Z.db',
      );
    });
  });

  describe('createBackup (H15)', () => {
    it('crea la carpeta y copia la base con sus datos', async () => {
      const file = await createBackup(db, { dir: backupsDir(), now: at('2026-10-10T17:00:00Z') });

      expect(file).toBe(path.join(backupsDir(), 'taskflow-2026-10-10T17-00-00-000Z.db'));
      const copy = new Database(file, { readonly: true });
      expect(copy.prepare('SELECT title FROM tasks').get().title).toBe('Tarea original');
      expect(copy.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
      copy.close();
    });

    it('conserva solo las últimas N copias automáticas', async () => {
      for (let hour = 10; hour <= 13; hour++) {
        await createBackup(db, {
          dir: backupsDir(),
          keep: 2,
          now: at(`2026-10-10T${hour}:00:00Z`),
        });
      }

      expect(names()).toEqual([
        'taskflow-2026-10-10T12-00-00-000Z.db',
        'taskflow-2026-10-10T13-00-00-000Z.db',
      ]);
    });
  });

  describe('pruneBackups', () => {
    it('no borra las copias previas a una restauración ni otros archivos', () => {
      fs.mkdirSync(backupsDir());
      for (const name of [
        'taskflow-2026-01-01T00-00-00-000Z.db',
        'taskflow-2026-01-02T00-00-00-000Z.db',
        'antes-de-restaurar-2025-01-01T00-00-00-000Z.db',
        'notas.txt',
      ]) {
        fs.writeFileSync(path.join(backupsDir(), name), '');
      }

      const removed = pruneBackups(backupsDir(), 1);

      expect(removed).toEqual(['taskflow-2026-01-01T00-00-00-000Z.db']);
      expect(names()).toEqual([
        'antes-de-restaurar-2025-01-01T00-00-00-000Z.db',
        'notas.txt',
        'taskflow-2026-01-02T00-00-00-000Z.db',
      ]);
    });
  });

  describe('listBackups', () => {
    it('devuelve una lista vacía si la carpeta no existe', () => {
      expect(listBackups(path.join(dir, 'no-existe'))).toEqual([]);
    });

    it('lista los respaldos del más reciente al más antiguo con su tamaño', async () => {
      await createBackup(db, { dir: backupsDir(), now: at('2026-10-10T10:00:00Z') });
      await createBackup(db, {
        dir: backupsDir(),
        now: at('2026-10-11T10:00:00Z'),
        prefix: 'antes-de-restaurar-',
      });
      fs.writeFileSync(path.join(backupsDir(), 'notas.txt'), 'no es un respaldo');

      const list = listBackups(backupsDir());

      expect(list.map((backup) => backup.name)).toEqual([
        'antes-de-restaurar-2026-10-11T10-00-00-000Z.db',
        'taskflow-2026-10-10T10-00-00-000Z.db',
      ]);
      expect(list[0].size).toBeGreaterThan(0);
      expect(list[0].file).toBe(path.join(backupsDir(), list[0].name));
    });
  });

  describe('validateBackupFile (H16)', () => {
    it('acepta un respaldo de TaskFlow', async () => {
      const file = await createBackup(db, { dir: backupsDir() });

      expect(validateBackupFile(file)).toBeNull();
    });

    it('acepta una base de la v1 (la API la actualizará al arrancar)', () => {
      const file = path.join(dir, 'v1.db');
      const v1 = new Database(file);
      v1.exec('CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL)');
      v1.close();

      expect(validateBackupFile(file)).toBeNull();
    });

    it.each([
      ['no existe', () => path.join(dir, 'nada.db'), 'El archivo no existe'],
      [
        'no es SQLite',
        () => {
          const file = path.join(dir, 'texto.db');
          fs.writeFileSync(file, 'esto no es una base de datos'.repeat(100));
          return file;
        },
        'El archivo no es una base de datos SQLite',
      ],
      [
        'es SQLite pero no de TaskFlow',
        () => {
          const file = path.join(dir, 'otra.db');
          const other = new Database(file);
          other.exec('CREATE TABLE facturas (id INTEGER PRIMARY KEY)');
          other.close();
          return file;
        },
        'El archivo no es una base de TaskFlow',
      ],
      [
        'es de una versión más nueva',
        () => {
          const file = path.join(dir, 'futura.db');
          const future = new Database(file);
          future.exec('CREATE TABLE tasks (id INTEGER PRIMARY KEY)');
          future.pragma(`user_version = ${SCHEMA_VERSION + 1}`);
          future.close();
          return file;
        },
        'El respaldo es de una versión más nueva de TaskFlow',
      ],
    ])('rechaza un archivo que %s', (_caso, makeFile, error) => {
      expect(validateBackupFile(makeFile())).toBe(error);
    });
  });

  describe('restoreBackup (H16)', () => {
    it('guarda la base actual y la reemplaza por el respaldo', async () => {
      const target = path.join(dir, 'taskflow.db');
      const backup = await createBackup(db, { dir: backupsDir() });
      db.prepare('DELETE FROM tasks').run();
      db.close();

      const result = restoreBackup(backup, {
        target,
        dir: backupsDir(),
        now: at('2026-10-12T08:00:00Z'),
      });

      expect(result.safetyCopy).toBe(
        path.join(backupsDir(), 'antes-de-restaurar-2026-10-12T08-00-00-000Z.db'),
      );
      const restored = new Database(target, { readonly: true });
      expect(restored.prepare('SELECT COUNT(*) AS n FROM tasks').get().n).toBe(1);
      restored.close();
      const previous = new Database(result.safetyCopy, { readonly: true });
      expect(previous.prepare('SELECT COUNT(*) AS n FROM tasks').get().n).toBe(0);
      previous.close();
    });

    it('funciona aunque todavía no exista la base actual', async () => {
      const backup = await createBackup(db, { dir: backupsDir() });
      db.close();
      const target = path.join(dir, 'nueva', 'taskflow.db');

      const result = restoreBackup(backup, { target, dir: backupsDir() });

      expect(result.safetyCopy).toBeNull();
      expect(fs.existsSync(target)).toBe(true);
    });

    it('no toca la base actual si el respaldo no es válido', () => {
      const target = path.join(dir, 'taskflow.db');
      db.close();
      const before = fs.readFileSync(target);
      const bad = path.join(dir, 'malo.db');
      fs.writeFileSync(bad, 'basura');

      expect(() => restoreBackup(bad, { target, dir: backupsDir() })).toThrow(
        'El archivo no es una base de datos SQLite',
      );
      expect(fs.readFileSync(target).equals(before)).toBe(true);
      expect(fs.existsSync(backupsDir())).toBe(false);
    });
  });

  describe('startBackupSchedule (H15)', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    const quietLog = () => ({ log: jest.fn(), error: jest.fn() });

    it('respalda al arrancar y luego cada intervalo', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      const log = quietLog();

      const schedule = startBackupSchedule(db, { dir: backupsDir(), intervalHours: 1, log });
      await schedule.first;
      expect(listBackups(backupsDir())).toHaveLength(1);

      jest.setSystemTime(Date.now() + 1000);
      await jest.advanceTimersByTimeAsync(60 * 60 * 1000);
      await schedule.last;
      schedule.stop();

      expect(listBackups(backupsDir())).toHaveLength(2);
      expect(log.log).toHaveBeenCalledWith(expect.stringContaining('Respaldo creado'));
    });

    it('con intervalo 0 solo respalda al arrancar', async () => {
      const schedule = startBackupSchedule(db, {
        dir: backupsDir(),
        intervalHours: 0,
        log: quietLog(),
      });
      await schedule.first;

      expect(schedule.timer).toBeNull();
      expect(listBackups(backupsDir())).toHaveLength(1);
    });

    it('si la copia falla, registra el error y no lanza', async () => {
      const log = quietLog();
      // Un archivo con el nombre de la carpeta impide crearla.
      const blocked = path.join(dir, 'bloqueado');
      fs.writeFileSync(blocked, '');

      const schedule = startBackupSchedule(db, { dir: blocked, intervalHours: 0, log });
      await expect(schedule.first).resolves.toBeNull();

      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo crear el respaldo'),
      );
    });
  });

  describe('backupConfig', () => {
    it('usa 24 horas y 10 copias por defecto', () => {
      const config = backupConfig({});

      expect(config).toMatchObject({ intervalHours: 24, keep: 10 });
      expect(config.dir).toMatch(/backups$/);
    });

    it('lee las variables de entorno', () => {
      expect(
        backupConfig({ BACKUP_DIR: '/tmp/r', BACKUP_INTERVAL_HOURS: '6', BACKUP_KEEP: '3' }),
      ).toEqual({ dir: path.resolve('/tmp/r'), intervalHours: 6, keep: 3 });
    });

    it('acepta 0 horas para desactivar el intervalo', () => {
      expect(backupConfig({ BACKUP_INTERVAL_HOURS: '0' }).intervalHours).toBe(0);
    });

    it.each([
      ['BACKUP_INTERVAL_HOURS', 'mucho'],
      ['BACKUP_INTERVAL_HOURS', '-1'],
      ['BACKUP_KEEP', '0'],
      ['BACKUP_KEEP', '2.5'],
    ])('rechaza %s=%s con un mensaje claro', (name, value) => {
      expect(() => backupConfig({ [name]: value })).toThrow(name);
    });
  });
});
