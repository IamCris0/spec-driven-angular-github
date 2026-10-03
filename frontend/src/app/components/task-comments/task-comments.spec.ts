import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Comment } from '../../models/task';
import { TaskComments } from './task-comments';

const URL = 'http://localhost:3000/api/tasks/7/comments';

const comment = (id: number, body: string, user_name = 'Ana Torres'): Comment => ({
  id,
  task_id: 7,
  user_id: 1,
  user_name,
  body,
  created_at: '2026-10-03T15:04:00.000Z',
});

describe('TaskComments', () => {
  let fixture: ComponentFixture<TaskComments>;
  let root: HTMLElement;
  let http: HttpTestingController;
  let added: Comment[];

  const bodies = () =>
    Array.from(root.querySelectorAll('[data-comment] p')).map((p) => p.textContent?.trim());
  const textarea = () => root.querySelector('textarea')!;
  async function send(text: string): Promise<void> {
    textarea().value = text;
    textarea().dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskComments],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TaskComments);
    root = fixture.nativeElement;
    added = [];
    fixture.componentInstance.added.subscribe((c) => added.push(c));
    fixture.componentRef.setInput('taskId', 7);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('carga y muestra los comentarios con su autor', async () => {
    http.expectOne(URL).flush([comment(1, 'Primero', 'Luis'), comment(2, 'Segundo')]);
    await fixture.whenStable();

    expect(bodies()).toEqual(['Primero', 'Segundo']);
    expect(root.textContent).toContain('Luis');
  });

  it('indica cuando no hay comentarios', async () => {
    http.expectOne(URL).flush([]);
    await fixture.whenStable();

    expect(root.textContent).toContain('Sin comentarios todavía');
  });

  it('agrega un comentario, lo muestra y avisa al padre', async () => {
    http.expectOne(URL).flush([]);
    await fixture.whenStable();

    await send('  ¿Lo reviso yo?  ');
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: '¿Lo reviso yo?' });
    req.flush(comment(5, '¿Lo reviso yo?'), { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(bodies()).toEqual(['¿Lo reviso yo?']);
    expect(added.map((c) => c.id)).toEqual([5]);
    expect(textarea().value).toBe('');
  });

  it('no envía un comentario vacío', async () => {
    http.expectOne(URL).flush([]);
    await fixture.whenStable();

    await send('   ');

    expect(root.textContent).toContain('El comentario no puede estar vacío');
  });

  it('muestra el error de la API', async () => {
    http.expectOne(URL).flush([]);
    await fixture.whenStable();

    await send('a'.repeat(10));
    http
      .expectOne(URL)
      .flush(
        { error: 'El comentario no puede superar los 500 caracteres' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('500 caracteres');
  });
});
