import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskInput } from '../../models/task';
import { TaskForm } from './task-form';

function type(element: Element | null, value: string): void {
  const control = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  control.value = value;
  control.dispatchEvent(new Event('input'));
  control.dispatchEvent(new Event('change'));
}

describe('TaskForm', () => {
  let fixture: ComponentFixture<TaskForm>;
  let root: HTMLElement;
  let saved: TaskInput[];

  const field = (id: string) => root.querySelector(`#${id}`);
  const error = () => root.querySelector('[data-error="title"]')?.textContent?.trim();

  async function submit(): Promise<void> {
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TaskForm] }).compileComponents();
    fixture = TestBed.createComponent(TaskForm);
    root = fixture.nativeElement;
    saved = [];
    fixture.componentInstance.saved.subscribe((task) => saved.push(task));
    await fixture.whenStable();
  });

  it('muestra "El título es obligatorio" y no guarda si el título está vacío', async () => {
    await submit();

    expect(error()).toBe('El título es obligatorio');
    expect(saved).toEqual([]);
  });

  it('trata un título de solo espacios como vacío', async () => {
    type(field('title'), '   ');
    await submit();

    expect(error()).toBe('El título es obligatorio');
    expect(saved).toEqual([]);
  });

  it('rechaza un título de más de 120 caracteres con un mensaje claro', async () => {
    type(field('title'), 'a'.repeat(121));
    await submit();

    expect(error()).toBe('El título no puede superar los 120 caracteres');
    expect(saved).toEqual([]);
  });

  it('emite solo el título y la prioridad por defecto cuando el resto está vacío', async () => {
    type(field('title'), 'Configurar CI');
    await submit();

    expect(saved).toEqual([{ title: 'Configurar CI', priority: 'media' }]);
  });

  it('emite todos los campos y recorta los espacios', async () => {
    type(field('title'), '  Revisar PR ');
    type(field('description'), 'Del compañero');
    type(field('priority'), 'alta');
    type(field('assignee'), ' Ana ');
    await submit();

    expect(saved).toEqual([
      { title: 'Revisar PR', description: 'Del compañero', priority: 'alta', assignee: 'Ana' },
    ]);
  });

  it('limpia el formulario después de guardar', async () => {
    type(field('title'), 'Tarea');
    await submit();

    expect((field('title') as HTMLInputElement).value).toBe('');
    expect((field('priority') as HTMLSelectElement).value).toBe('media');
    expect(error()).toBeUndefined();
  });
});
