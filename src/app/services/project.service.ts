import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Project } from '../models/project.model';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(this.apiUrl).pipe(
      map(response => response.success ? response.data : [])
    );
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<ApiResponse<Project>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createProject(project: Project): Observable<Project> {
    return this.http.post<ApiResponse<Project>>(this.apiUrl, project).pipe(
      map(response => response.data)
    );
  }

  updateProject(id: string, project: Project): Observable<Project> {
    return this.http.put<ApiResponse<Project>>(`${this.apiUrl}/${id}`, project).pipe(
      map(response => response.data)
    );
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
