import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

export interface Availability {
  id?: number;
  badge_text: string;
  headline: string;
  description: string;
  tags: AvailabilityTag[];
  primary_cta_text: string;
  primary_cta_type: string;
  secondary_cta_text: string;
  secondary_cta_url: string;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityTag {
  text: string;
  icon?: string | null;
  emoji?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AvailabilityService {
  private apiUrl = `${environment.apiUrl}/availability`;

  constructor(private http: HttpClient) {}

  getAvailability(): Observable<Availability | null> {
    return this.http.get<ApiResponse<Availability | null>>(this.apiUrl).pipe(
      map(response => response.success ? response.data : null),
      map(data => {
        if (!data) return null;
        const tags = this.normalizeTags((data as any).tags);
        return { ...data, tags };
      })
    );
  }

  private normalizeTags(input: unknown): AvailabilityTag[] {
    if (Array.isArray(input)) {
      return input
        .map(v => this.tagToTag(v))
        .filter((v): v is AvailabilityTag => !!v);
    }

    if (typeof input === 'string') {
      const raw = input.trim();
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map(v => this.tagToTag(v))
            .filter((v): v is AvailabilityTag => !!v);
        }
      } catch {}
      return raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(text => ({ text }));
    }

    const single = this.tagToTag(input);
    return single ? [single] : [];
  }

  private tagToTag(value: unknown): AvailabilityTag | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const text = value.trim();
      return text ? { text } : null;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return { text: String(value) };
    }

    if (typeof value === 'object') {
      const v = value as Record<string, unknown>;

      const iconRaw = this.pickFirstString(v, ['icon', 'icon_class', 'iconClass', 'class', 'className']);
      const emojiRaw = this.pickFirstString(v, ['emoji']);
      const textRaw = this.pickFirstString(v, ['text', 'label', 'name', 'title', 'value', 'tag']);

      const icon = iconRaw?.trim() || null;
      const emoji = emojiRaw?.trim() || null;
      const text = textRaw?.trim() || null;

      if (text) return { text, icon, emoji };

      const fallbackText = Object.values(v).find(x => typeof x === 'string' && x.trim());
      if (typeof fallbackText === 'string') return { text: fallbackText.trim(), icon, emoji };
    }

    return null;
  }

  private pickFirstString(obj: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) return v;
    }
    return null;
  }
}
