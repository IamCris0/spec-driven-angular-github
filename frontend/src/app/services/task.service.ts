import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api';
import { Comment, Stats, Task, TaskInput, TaskStatus } from '../models/task';

/** Cliente HTTP de la API REST de tareas (contrato en specs/001-gestor-tareas/plan.md). */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly tasksUrl = `${API_URL}/tasks`;

  /** Filtro por responsable y búsqueda por texto; los valores vacíos no se envían. */
  list(assignee?: string, query?: string): Observable<Task[]> {
    let params = new HttpParams();
    if (assignee) {
      params = params.set('assignee', assignee);
    }
    if (query?.trim()) {
      params = params.set('q', query.trim());
    }
    return this.http.get<Task[]>(this.tasksUrl, { params });
  }

  get(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.tasksUrl}/${id}`);
  }

  create(task: TaskInput): Observable<Task> {
    return this.http.post<Task>(this.tasksUrl, task);
  }

  update(id: number, task: TaskInput): Observable<Task> {
    return this.http.put<Task>(`${this.tasksUrl}/${id}`, task);
  }

  updateStatus(id: number, status: TaskStatus): Observable<Task> {
    return this.http.patch<Task>(`${this.tasksUrl}/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.tasksUrl}/${id}`);
  }

  comments(taskId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.tasksUrl}/${taskId}/comments`);
  }

  addComment(taskId: number, body: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.tasksUrl}/${taskId}/comments`, { body });
  }

  stats(): Observable<Stats> {
    return this.http.get<Stats>(`${API_URL}/stats`);
  }
}
