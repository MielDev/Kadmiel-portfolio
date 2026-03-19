import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Skill } from '../models/skill.model';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SkillService {
  private apiUrl = `${environment.apiUrl}/skills`;

  constructor(private http: HttpClient) {}

  getSkills(): Observable<Skill[]> {
    return this.http.get<ApiResponse<any[]>>(this.apiUrl).pipe(
      map(response => {
        if (!response.success) return [];
        return response.data.map(skill => {
          // Parse technologies if it's a string
          if (typeof skill.technologies === 'string') {
            try {
              skill.technologies = JSON.parse(skill.technologies);
            } catch (e) {
              skill.technologies = [];
            }
          }
          return skill as Skill;
        });
      })
    );
  }

  getSkill(id: string): Observable<Skill> {
    return this.http.get<ApiResponse<Skill>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createSkill(skill: Skill): Observable<Skill> {
    return this.http.post<ApiResponse<Skill>>(this.apiUrl, skill).pipe(
      map(response => response.data)
    );
  }

  updateSkill(id: string, skill: Skill): Observable<Skill> {
    return this.http.put<ApiResponse<Skill>>(`${this.apiUrl}/${id}`, skill).pipe(
      map(response => response.data)
    );
  }

  deleteSkill(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
