import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export type AnalyticsEventType =
  | 'pageview'
  | 'section_view'
  | 'click'
  | 'contact_submit'
  | 'contact_success'
  | 'contact_error';

export interface TrackPayload {
  consent_analytics: boolean;
  event_type: string | null;
  page: string | null;
  path: string | null;
  source: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  country: string | null;
  device: string | null;
  user_agent: string | null;
  language: string | null;
  timezone: string | null;
  screen_width: number | null;
  screen_height: number | null;
  session_id: string | null;
  color_scheme: string | null;
  device_memory: number | null;
  hardware_concurrency: number | null;
  ad_interests: string[] | null;
  ad_click_source: string | null;
  retargeting_eligible: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly storageKey = 'analytics_consent';
  private readonly sessionKey = 'analytics_session_id';
  private readonly apiUrl = `${environment.apiUrl}/analytics/track`;
  private readonly statsUrl = `${environment.apiUrl}/analytics/stats`;
  private readonly overviewUrl = `${environment.apiUrl}/analytics/overview`;
  private readonly dailyUrl = `${environment.apiUrl}/analytics/daily`;
  private readonly sourcesUrl = `${environment.apiUrl}/analytics/sources`;
  private readonly countriesUrl = `${environment.apiUrl}/analytics/countries`;

  private lastTrackedEvent: { type: string, path: string, time: number } | null = null;
  private consentSubject = new BehaviorSubject<boolean | null>(this.getInitialConsent());
  private viewedSections: Set<string> = new Set();

  constructor(private http: HttpClient) {}

  private getInitialConsent(): boolean | null {
    const v = localStorage.getItem(this.storageKey);
    if (v === 'true') return true;
    if (v === 'false') return false;
    return null;
  }

  getConsent$(): Observable<boolean | null> {
    return this.consentSubject.asObservable();
  }

  getConsent(): boolean {
    return this.consentSubject.value === true;
  }

  setConsent(consent: boolean): void {
    localStorage.setItem(this.storageKey, String(consent));
    this.consentSubject.next(consent);
  }

  track(eventType: AnalyticsEventType | string, partial: Partial<TrackPayload> = {}): Observable<boolean> {
    const consent = this.getConsent();
    const url = new URL(window.location.href);
    const device = this.getDeviceType();

    const strOrNull = (v: unknown): string | null => {
      if (typeof v !== 'string') return null;
      const s = v.trim();
      return s ? s : null;
    };

    const referrer = strOrNull(partial.referrer) ?? strOrNull(document.referrer);
    const utmSource = strOrNull(partial.utm_source) ?? strOrNull(url.searchParams.get('utm_source'));
    const computedSource =
      strOrNull(partial.source) ??
      utmSource ??
      this.tryGetHostname(referrer) ??
      'direct';

    if (eventType === 'section_view' && partial.path) {
      this.viewedSections.add(partial.path.replace('/', ''));
    }

    const payload: TrackPayload = {
      consent_analytics: consent,
      event_type: strOrNull(eventType) ?? String(eventType),
      page: strOrNull(partial.page) ?? strOrNull(url.pathname),
      path: strOrNull(partial.path) ?? strOrNull(url.pathname + url.search + url.hash),
      source: computedSource,
      referrer,
      utm_source: utmSource,
      utm_medium: strOrNull(partial.utm_medium) ?? strOrNull(url.searchParams.get('utm_medium')),
      utm_campaign: strOrNull(partial.utm_campaign) ?? strOrNull(url.searchParams.get('utm_campaign')),
      utm_content: strOrNull(partial.utm_content) ?? strOrNull(url.searchParams.get('utm_content')),
      utm_term: strOrNull(partial.utm_term) ?? strOrNull(url.searchParams.get('utm_term')),
      country: strOrNull(partial.country),
      device: strOrNull(partial.device) ?? strOrNull(device),
      user_agent: strOrNull(partial.user_agent) ?? strOrNull(navigator.userAgent),
      language: strOrNull(partial.language) ?? strOrNull(navigator.language),
      timezone: strOrNull(partial.timezone) ?? strOrNull(Intl.DateTimeFormat().resolvedOptions().timeZone),
      screen_width: consent ? (partial.screen_width ?? window.screen?.width ?? null) : null,
      screen_height: consent ? (partial.screen_height ?? window.screen?.height ?? null) : null,
      session_id: consent ? (partial.session_id ?? this.getSessionId()) : null,
      color_scheme: consent ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : null,
      device_memory: consent ? ((navigator as any).deviceMemory || null) : null,
      hardware_concurrency: consent ? (navigator.hardwareConcurrency || null) : null,
      ad_interests: consent ? Array.from(this.viewedSections) : null,
      ad_click_source: consent ? (url.searchParams.get('gclid') || url.searchParams.get('fbclid') || null) : null,
      retargeting_eligible: consent && this.viewedSections.size >= 3,
    };

    // Protection contre le double tracking identique (ex: déclenchement simultané de plusieurs reveals)
    const now = Date.now();
    if (
      this.lastTrackedEvent &&
      this.lastTrackedEvent.type === payload.event_type &&
      this.lastTrackedEvent.path === payload.path &&
      now - this.lastTrackedEvent.time < 500
    ) {
      return of(true);
    }
    this.lastTrackedEvent = { type: payload.event_type || '', path: payload.path || '', time: now };

    console.group('📊 Analytics Event');
    console.log('Event Type:', payload.event_type);
    console.log('Payload:', payload);
    // debugger; // Décommentez pour analyser la pile d'appels si nécessaire
    console.groupEnd();

    return this.http.post<{ success: boolean }>(this.apiUrl, payload).pipe(
      map(() => {
        console.log(`✅ [Analytics] Successfully tracked: ${payload.event_type}`);
        return true;
      }),
      catchError((error) => {
        console.error(`❌ [Analytics] Failed to track: ${payload.event_type}`, error);
        return of(false);
      })
    );
  }

  getStats(): Observable<any> {
    return this.http.get<ApiResponse<any>>(this.statsUrl).pipe(
      map(response => response.success ? response.data : null),
      catchError(error => {
        console.error('❌ [Analytics] Failed to fetch stats', error);
        return of(null);
      })
    );
  }

  getOverview(): Observable<any> {
    return this.http.get<ApiResponse<any>>(this.overviewUrl).pipe(
      map(response => response.success ? response.data : null),
      catchError(error => {
        console.error('❌ [Analytics] Failed to fetch overview', error);
        return of(null);
      })
    );
  }

  getDailyStats(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(this.dailyUrl).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('❌ [Analytics] Failed to fetch daily stats', error);
        return of([]);
      })
    );
  }

  getSources(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(this.sourcesUrl).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('❌ [Analytics] Failed to fetch sources', error);
        return of([]);
      })
    );
  }

  getCountries(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(this.countriesUrl).pipe(
      map(response => response.success ? response.data : []),
      catchError(error => {
        console.error('❌ [Analytics] Failed to fetch countries', error);
        return of([]);
      })
    );
  }

  private tryGetHostname(url: string | null): string | null {
    if (!url) return null;
    try {
      return new URL(url).hostname || null;
    } catch {
      return null;
    }
  }

  private getDeviceType(): string {
    if (window.matchMedia('(max-width: 768px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1024px)').matches) return 'tablet';
    return 'desktop';
  }

  private getSessionId(): string {
    const existing = localStorage.getItem(this.sessionKey);
    if (existing) return existing;
    const id = this.generateId();
    localStorage.setItem(this.sessionKey, id);
    return id;
  }

  private generateId(): string {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

