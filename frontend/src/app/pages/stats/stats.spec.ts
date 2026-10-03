import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Stats as StatsData } from '../../models/task';
import { Stats } from './stats';

const URL = 'http://localhost:3000/api/stats';

const data: StatsData = {
  total: 8,
  byStatus: { pendiente: 3, en_progreso: 3, hecha: 2 },
  overdue: 2,
  byAssignee: [
    { assignee: 'Ana', total: 5, done: 2 },
    { assignee: null, total: 3, done: 0 },
  ],
};

describe('Stats', () => {
  let fixture: ComponentFixture<Stats>;
  let root: HTMLElement;
  let http: HttpTestingController;

  const tile = (name: string) =>
    root.querySelector(`[data-stat="${name}"]`)?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Stats],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Stats);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('muestra el total, las vencidas y el porcentaje completado', async () => {
    http.expectOne(URL).flush(data);
    await fixture.whenStable();

    expect(tile('total')).toContain('8');
    expect(tile('overdue')).toContain('2');
    expect(tile('done')).toContain('25%');
  });

  it('muestra cuántas tareas hay en cada estado, con su nombre', async () => {
    http.expectOne(URL).flush(data);
    await fixture.whenStable();

    const legend = Array.from(root.querySelectorAll('[data-legend]')).map((item) =>
      item.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(legend).toEqual(['Por hacer 3', 'En progreso 3', 'Hecho 2']);
  });

  it('muestra el avance de cada responsable, incluidas las tareas sin asignar', async () => {
    http.expectOne(URL).flush(data);
    await fixture.whenStable();

    const rows = Array.from(root.querySelectorAll('[data-assignee]')).map((row) =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(rows[0]).toContain('Ana');
    expect(rows[0]).toContain('2 de 5');
    expect(rows[0]).toContain('40%');
    expect(rows[1]).toContain('Sin asignar');
    expect(rows[1]).toContain('0 de 3');
  });

  it('con el tablero vacío no divide entre cero', async () => {
    http.expectOne(URL).flush({
      total: 0,
      byStatus: { pendiente: 0, en_progreso: 0, hecha: 0 },
      overdue: 0,
      byAssignee: [],
    });
    await fixture.whenStable();

    expect(tile('done')).toContain('0%');
    expect(root.textContent).toContain('Todavía no hay tareas');
  });

  it('avisa si no puede cargar las estadísticas', async () => {
    http
      .expectOne(URL)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo conectar con el servidor',
    );
  });
});
