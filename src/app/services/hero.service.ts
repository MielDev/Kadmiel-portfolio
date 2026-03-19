import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { HeroData } from '../models/hero.model';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HeroService {
  private apiUrl = `${environment.apiUrl}/hero`;

  constructor(private http: HttpClient) {}

  getHero(): Observable<HeroData> {
    return this.http.get<ApiResponse<HeroData>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  updateHero(hero: HeroData): Observable<void> {
    return this.http.put<ApiResponse<void>>(this.apiUrl, hero).pipe(
      map(() => undefined)
    );
  }
}
