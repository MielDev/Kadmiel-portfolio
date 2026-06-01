import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map, tap } from 'rxjs';

/**
 * SSR-safe: every access to `localStorage` is guarded by `isPlatformBrowser`,
 * so the service can be instantiated during server rendering without crashing.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'auth_token';
  private apiUrl = `${environment.apiUrl}/auth`;
  private readonly isBrowser: boolean;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  login(username: string, password: string): Observable<void> {
    return this.http
      .post<ApiResponse<{ token: string }>>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map((response) => response.data),
        tap((data) => {
          if (this.isBrowser) localStorage.setItem(this.tokenKey, data.token);
        }),
        map(() => undefined)
      );
  }

  logout(): void {
    if (this.isBrowser) localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (e) {
      return true;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }
}
