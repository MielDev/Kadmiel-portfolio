import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Testimonial } from '../models/testimonial.model';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TestimonialService {
  private apiUrl = `${environment.apiUrl}/testimonials`;

  constructor(private http: HttpClient) {}

  getTestimonials(): Observable<Testimonial[]> {
    return this.http.get<ApiResponse<Testimonial[]>>(this.apiUrl).pipe(
      map(response => response.success ? response.data : [])
    );
  }

  getTestimonial(id: string): Observable<Testimonial> {
    return this.http.get<ApiResponse<Testimonial>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createTestimonial(testimonial: Testimonial): Observable<Testimonial> {
    return this.http.post<ApiResponse<Testimonial>>(this.apiUrl, testimonial).pipe(
      map(response => response.data)
    );
  }

  updateTestimonial(id: string, testimonial: Testimonial): Observable<Testimonial> {
    return this.http.put<ApiResponse<Testimonial>>(`${this.apiUrl}/${id}`, testimonial).pipe(
      map(response => response.data)
    );
  }

  deleteTestimonial(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  approveTestimonial(id: string): Observable<Testimonial> {
    return this.http.put<ApiResponse<Testimonial>>(`${this.apiUrl}/${id}/approve`, {}).pipe(
      map(response => response.data)
    );
  }
}
