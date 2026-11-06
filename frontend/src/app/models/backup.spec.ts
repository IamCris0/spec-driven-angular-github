import { parseBackup } from './backup';

describe('parseBackup', () => {
  const valid = {
    format: 'taskflow-backup',
    version: 1,
    exported_at: '2026-10-10T17:00:00.000Z',
    exported_by: 'Ana Torres',
    tasks: [{ title: 'Uno' }, { title: 'Dos' }],
  };

  it('devuelve el respaldo cuando el archivo es válido', () => {
    expect(parseBackup(JSON.stringify(valid))).toEqual({ backup: valid });
  });

  it.each([
    ['no es JSON', '{ esto no es json', 'El archivo no es un JSON válido'],
    ['es JSON pero no un respaldo', '{"tareas": []}', 'El archivo no es un respaldo de TaskFlow'],
    ['es una lista', '[1, 2]', 'El archivo no es un respaldo de TaskFlow'],
    ['es null', 'null', 'El archivo no es un respaldo de TaskFlow'],
    [
      'es de otra versión',
      JSON.stringify({ ...valid, version: 2 }),
      'La versión del respaldo no es compatible',
    ],
  ])('explica el problema cuando el archivo %s', (_caso, text, error) => {
    expect(parseBackup(text)).toEqual({ error });
  });
});
