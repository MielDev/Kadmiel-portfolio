import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Experience } from '../models/experience.model';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ExperienceService {
  private apiUrl = `${environment.apiUrl}/experiences`;

  constructor(private http: HttpClient) {}

  getExperiences(): Observable<Experience[]> {
    return this.http.get<ApiResponse<Experience[]>>(this.apiUrl).pipe(
      map(response => response.success ? response.data : [])
    );
  }

  getExperience(id: string): Observable<Experience> {
    return this.http.get<ApiResponse<Experience>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createExperience(experience: Experience): Observable<Experience> {
    return this.http.post<ApiResponse<Experience>>(this.apiUrl, experience).pipe(
      map(response => response.data)
    );
  }

  updateExperience(id: string, experience: Experience): Observable<Experience> {
    return this.http.put<ApiResponse<Experience>>(`${this.apiUrl}/${id}`, experience).pipe(
      map(response => response.data)
    );
  }

  deleteExperience(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
