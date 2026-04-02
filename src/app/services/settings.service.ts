import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Setting {
  setting_key: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getAllSettings(): Observable<{ [key: string]: any }> {
    return this.http.get<{ success: boolean, data: Setting[] }>(this.apiUrl).pipe(
      map(res => {
        const settings: { [key: string]: any } = {};
        if (res.success && res.data) {
          res.data.forEach(s => {
            try {
              // Try to parse JSON if it looks like an object/array
              if (s.value.startsWith('{') || s.value.startsWith('[')) {
                settings[s.setting_key] = JSON.parse(s.value);
              } else {
                settings[s.setting_key] = s.value;
              }
            } catch (e) {
              settings[s.setting_key] = s.value;
            }
          });
        }
        return settings;
      })
    );
  }

  updateSetting(key: string, value: any): Observable<any> {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    return this.http.put(`${this.apiUrl}/${key}`, { value: valStr });
  }

  updateMultipleSettings(settings: { [key: string]: any }): Observable<any[]> {
    const requests = Object.entries(settings).map(([key, value]) => 
      this.updateSetting(key, value)
    );
    // Note: This is not ideal for performance but matches the backend route
    // In a real app, we'd add a bulk update route to the backend
    return forkJoin(requests);
  }
}
