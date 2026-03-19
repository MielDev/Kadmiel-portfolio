import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Blog } from '../models/blog.model';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private apiUrl = `${environment.apiUrl}/blog`;

  constructor(private http: HttpClient) {}

  getBlogs(): Observable<Blog[]> {
    return this.http.get<ApiResponse<Blog[]>>(this.apiUrl).pipe(
      map(response => response.success ? response.data : [])
    );
  }

  getBlog(id: string): Observable<Blog> {
    return this.http.get<ApiResponse<Blog>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  getBlogBySlug(slug: string): Observable<Blog> {
    return this.http.get<ApiResponse<Blog>>(`${this.apiUrl}/slug/${slug}`).pipe(
      map(response => response.data)
    );
  }

  createBlog(blog: Blog): Observable<Blog> {
    return this.http.post<ApiResponse<Blog>>(this.apiUrl, blog).pipe(
      map(response => response.data)
    );
  }

  updateBlog(id: string, blog: Blog): Observable<Blog> {
    return this.http.put<ApiResponse<Blog>>(`${this.apiUrl}/${id}`, blog).pipe(
      map(response => response.data)
    );
  }

  deleteBlog(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
