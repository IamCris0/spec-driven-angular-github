import { Component, OnInit, input, output, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TASK_PRIORITIES, Task, TaskInput, TaskPriority } from '../../models/task';

const MAX_TITLE_LENGTH = 120;
// Mismos límites y mensajes que la API (specs/003-respaldos-validaciones, H19).
export const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ASSIGNEE_LENGTH = 60;
export const MIN_DUE_DATE = '2000-01-01';
export const MAX_DUE_DATE = '2099-12-31';

// Hay varios formularios a la vez (crear y editar): cada uno necesita ids únicos.
let nextFormId = 0;

function titleValidator(control: AbstractControl<string>) {
  const title = control.value.trim();
  if (title === '') {
    return { required: true };
  }
  return title.length > MAX_TITLE_LENGTH ? { maxlength: true } : null;
}

const maxLength = (max: number, message: string) => (control: AbstractControl<string>) =>
  control.value.trim().length > max ? { message } : null;

// El input de fecha admite años de cinco cifras, que como texto quedarían dentro del rango: primero se
// exige el formato AAAA-MM-DD, igual que la API.
function dueDateValidator(control: AbstractControl<string>) {
  const value = control.value;
  if (!value) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { message: 'La fecha límite no es válida' };
  }
  return value < MIN_DUE_DATE || value > MAX_DUE_DATE
    ? { message: 'La fecha límite debe estar entre los años 2000 y 2099' }
    : null;
}

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.html',
})
export class TaskForm implements OnInit {
  /** Tarea que se edita; sin ella el formulario crea una tarea nueva. */
  readonly task = input<Task | null>(null);
  readonly saved = output<TaskInput>();
  readonly cancelled = output<void>();

  protected readonly formId = nextFormId++;
  protected readonly priorities = TASK_PRIORITIES;
  protected readonly maxDescription = MAX_DESCRIPTION_LENGTH;
  protected readonly minDueDate = MIN_DUE_DATE;
  protected readonly maxDueDate = MAX_DUE_DATE;
  protected readonly submitted = signal(false);
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [titleValidator] }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [
        maxLength(
          MAX_DESCRIPTION_LENGTH,
          `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres`,
        ),
      ],
    }),
    priority: new FormControl<TaskPriority>('media', { nonNullable: true }),
    assignee: new FormControl('', {
      nonNullable: true,
      validators: [
        maxLength(
          MAX_ASSIGNEE_LENGTH,
          `El responsable no puede superar los ${MAX_ASSIGNEE_LENGTH} caracteres`,
        ),
      ],
    }),
    due_date: new FormControl('', { nonNullable: true, validators: [dueDateValidator] }),
  });

  /** Mensaje de error de un campo opcional, después de tocarlo o de intentar guardar. */
  protected message(name: 'description' | 'assignee' | 'due_date'): string | null {
    const control = this.form.controls[name];
    return control.touched || this.submitted() ? (control.errors?.['message'] ?? null) : null;
  }

  ngOnInit(): void {
    const task = this.task();
    if (task) {
      this.form.patchValue({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        assignee: task.assignee ?? '',
        due_date: task.due_date ?? '',
      });
    }
  }

  protected get title() {
    return this.form.controls.title;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.submitted.set(true);
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, priority, assignee, due_date } = this.form.getRawValue();
    const task: TaskInput = { title: title.trim(), priority };
    if (description.trim()) {
      task.description = description.trim();
    }
    if (assignee.trim()) {
      task.assignee = assignee.trim();
    }
    if (due_date) {
      task.due_date = due_date;
    }

    this.saved.emit(task);
    if (!this.task()) {
      this.form.reset();
      this.submitted.set(false);
    }
  }
}
