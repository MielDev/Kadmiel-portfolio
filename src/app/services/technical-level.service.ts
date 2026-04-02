import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { TechnicalLevel } from '../models/technical-level.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TechnicalLevelService {
  private apiUrl = `${environment.apiUrl}/technical-levels`;

  constructor(private http: HttpClient) {}

  getTechnicalLevels(type?: TechnicalLevel['type']): Observable<TechnicalLevel[]> {
    const params = type ? new HttpParams().set('type', type) : undefined;
    return this.http.get<ApiResponse<TechnicalLevel[]>>(this.apiUrl, { params }).pipe(
      map(response => response.success ? response.data : [])
    );
  }

  getTechnicalLevel(id: number): Observable<TechnicalLevel | null> {
    return this.http.get<ApiResponse<TechnicalLevel>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.success ? response.data : null)
    );
  }

  createTechnicalLevel(data: Partial<TechnicalLevel>): Observable<TechnicalLevel | null> {
    return this.http.post<ApiResponse<TechnicalLevel>>(this.apiUrl, data).pipe(
      map(response => response.success ? response.data : null)
    );
  }

  updateTechnicalLevel(id: number, data: Partial<TechnicalLevel>): Observable<TechnicalLevel | null> {
    return this.http.put<ApiResponse<TechnicalLevel>>(`${this.apiUrl}/${id}`, data).pipe(
      map(response => response.success ? response.data : null)
    );
  }

  deleteTechnicalLevel(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.success)
    );
  }
}
