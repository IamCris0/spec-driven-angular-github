import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Task, TaskInput, TaskStatus } from '../models/task';

const API_URL = 'http://localhost:3000/api';

/** Cliente HTTP de la API REST de tareas (contrato en specs/001-gestor-tareas/plan.md). */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly tasksUrl = `${API_URL}/tasks`;

  list(assignee?: string): Observable<Task[]> {
    const params = assignee ? new HttpParams().set('assignee', assignee) : undefined;
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
}
