import { Component, OnInit, input, output, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TASK_PRIORITIES, Task, TaskInput, TaskPriority } from '../../models/task';

const MAX_TITLE_LENGTH = 120;

// Hay varios formularios a la vez (crear y editar): cada uno necesita ids únicos.
let nextFormId = 0;

function titleValidator(control: AbstractControl<string>) {
  const title = control.value.trim();
  if (title === '') {
    return { required: true };
  }
  return title.length > MAX_TITLE_LENGTH ? { maxlength: true } : null;
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
  protected readonly submitted = signal(false);
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [titleValidator] }),
    description: new FormControl('', { nonNullable: true }),
    priority: new FormControl<TaskPriority>('media', { nonNullable: true }),
    assignee: new FormControl('', { nonNullable: true }),
    due_date: new FormControl('', { nonNullable: true }),
  });

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
      this.title.markAsTouched();
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
