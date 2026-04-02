import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

export interface About {
  id?: number;
  name: string;
  title: string;
  bio: string;
  photo?: string;
  resume_url?: string;
  location: string;
  nationality?: string;
  email: string;
  phone: string;
  interests: string[];
  social_links?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    [key: string]: string | undefined;
  };
  updated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AboutService {
  private apiUrl = `${environment.apiUrl}/about`;

  constructor(private http: HttpClient) {}

  getAbout(): Observable<About> {
    return this.http.get<ApiResponse<any>>(this.apiUrl).pipe(
      map(response => {
        const data = response.data;
        // Parse interests if it's a string
        if (typeof data.interests === 'string') {
          try {
            data.interests = JSON.parse(data.interests);
          } catch (e) {
            data.interests = [];
          }
        }
        // Parse social_links if it's a string
        if (typeof data.social_links === 'string') {
          try {
            data.social_links = JSON.parse(data.social_links);
          } catch (e) {
            data.social_links = {};
          }
        }
        return data as About;
      })
    );
  }

  updateAbout(about: About): Observable<About> {
    return this.http.put<ApiResponse<About>>(this.apiUrl, about).pipe(
      map(response => response.data)
    );
  }

  uploadPhoto(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<ApiResponse<{ photo: string }>>(`${this.apiUrl}/upload-photo`, formData).pipe(
      map(response => response.data.photo)
    );
  }
}
