import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Comment } from '../../models/task';
import { TaskService } from '../../services/task.service';

/** Comentarios de una tarea (H12): se cargan al abrir el panel. */
@Component({
  selector: 'app-task-comments',
  imports: [ReactiveFormsModule],
  templateUrl: './task-comments.html',
})
export class TaskComments implements OnInit {
  private readonly taskService = inject(TaskService);

  readonly taskId = input.required<number>();
  readonly added = output<Comment>();

  protected readonly comments = signal<Comment[]>([]);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly body = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.taskService.comments(this.taskId()).subscribe({
      next: (comments) => {
        this.comments.set(comments);
        this.loaded.set(true);
      },
      error: (error: HttpErrorResponse) => this.error.set(this.message(error)),
    });
  }

  protected send(): void {
    const body = this.body.value.trim();
    if (!body) {
      this.error.set('El comentario no puede estar vacío');
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    this.taskService.addComment(this.taskId(), body).subscribe({
      next: (comment) => {
        this.comments.update((comments) => [...comments, comment]);
        this.body.reset();
        this.sending.set(false);
        this.added.emit(comment);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.message(error));
        this.sending.set(false);
      },
    });
  }

  /** Fecha y hora locales, por ejemplo 03/10/2026 10:04. */
  protected when(iso: string): string {
    return new Date(iso).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  }

  private message(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor';
    }
    return error.error?.error ?? 'Ocurrió un error inesperado';
  }
}
