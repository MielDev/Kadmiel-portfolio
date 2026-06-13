import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

/**
 * SSR-safe: every browser API (localStorage, window, document, navigator, crypto)
 * is guarded by `isPlatformBrowser`. On the server, `track()` is a no-op so the
 * prerender step doesn't crash and doesn't pollute analytics with bot hits.
 */
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
  private readonly devicesUrl = `${environment.apiUrl}/analytics/devices`;
  private readonly browsersUrl = `${environment.apiUrl}/analytics/browsers`;
  private readonly topPagesUrl = `${environment.apiUrl}/analytics/top-pages`;
  private readonly eventsUrl = `${environment.apiUrl}/analytics/recent-events`;
  private readonly realtimeUrl = `${environment.apiUrl}/analytics/realtime`;
  private readonly hourlyUrl = `${environment.apiUrl}/analytics/hourly`;

  private lastTrackedEvent: { type: string; path: string; time: number } | null = null;
  private consentSubject: BehaviorSubject<boolean | null>;
  private viewedSections: Set<string> = new Set();
  private readonly isBrowser: boolean;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.consentSubject = new BehaviorSubject<boolean | null>(this.getInitialConsent());
  }

  private getInitialConsent(): boolean | null {
    if (!this.isBrowser) return null;
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
    if (this.isBrowser) localStorage.setItem(this.storageKey, String(consent));
    this.consentSubject.next(consent);
  }

  track(eventType: AnalyticsEventType | string, partial: Partial<TrackPayload> = {}): Observable<boolean> {
    // No-op during SSR / prerender. Real users will track on hydration.
    if (!this.isBrowser) return of(false);

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
      strOrNull(partial.source) ?? utmSource ?? this.tryGetHostname(referrer) ?? 'direct';

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
      user_agent: consent ? strOrNull(partial.user_agent) ?? strOrNull(navigator.userAgent) : null,
      language: consent ? strOrNull(partial.language) ?? strOrNull(navigator.language) : null,
      timezone: consent
        ? strOrNull(partial.timezone) ?? strOrNull(Intl.DateTimeFormat().resolvedOptions().timeZone)
        : null,
      screen_width: consent ? partial.screen_width ?? window.screen?.width ?? null : null,
      screen_height: consent ? partial.screen_height ?? window.screen?.height ?? null : null,
      session_id: consent ? partial.session_id ?? this.getSessionId() : null,
      color_scheme: consent
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : null,
      device_memory: consent ? (navigator as any).deviceMemory || null : null,
      hardware_concurrency: consent ? navigator.hardwareConcurrency || null : null,
      ad_interests: consent ? Array.from(this.viewedSections) : null,
      ad_click_source: consent
        ? url.searchParams.get('gclid') || url.searchParams.get('fbclid') || null
        : null,
      retargeting_eligible: consent && this.viewedSections.size >= 3,
    };

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

    return this.http.post<{ success: boolean }>(this.apiUrl, payload).pipe(
      map(() => true),
      catchError((error) => {
        this.logAnalyticsError(`Failed to track: ${payload.event_type}`, error);
        return of(false);
      })
    );
  }

  getStats(): Observable<any> {
    return this.http.get<ApiResponse<any>>(this.statsUrl).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch stats', error);
        return of(null);
      })
    );
  }

  getOverview(range?: string): Observable<any> {
    const url = range ? `${this.overviewUrl}?range=${range}` : this.overviewUrl;
    return this.http.get<ApiResponse<any>>(url).pipe(
      map((response) => (response.success ? response.data : null)),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch overview', error);
        return of(null);
      })
    );
  }

  getDailyStats(range?: string): Observable<any[]> {
    const url = range ? `${this.dailyUrl}?range=${range}` : this.dailyUrl;
    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map((response) => (response.success ? response.data : [])),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch daily stats', error);
        return of([]);
      })
    );
  }

  getSources(range?: string): Observable<any[]> {
    const url = range ? `${this.sourcesUrl}?range=${range}` : this.sourcesUrl;
    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map((response) => (response.success ? response.data : [])),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch sources', error);
        return of([]);
      })
    );
  }

  getCountries(range?: string): Observable<any[]> {
    const url = range ? `${this.countriesUrl}?range=${range}` : this.countriesUrl;
    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map((response) => (response.success ? response.data : [])),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch countries', error);
        return of([]);
      })
    );
  }

  getDevices(range?: string): Observable<any[]> {
    const url = range ? `${this.devicesUrl}?range=${range}` : this.devicesUrl;
    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map((response) => (response.success ? response.data : [])),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch devices', error);
        return of([]);
      })
    );
  }

  getBrowsers(range?: string): Observable<any[]> {
    const url = range ? `${this.browsersUrl}?range=${range}` : this.browsersUrl;
    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map((response) => (response.success ? response.data : [])),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch browsers', error);
        return of([]);
      })
    );
  }

  getTopPages(range?: string): Observable<any[]> {
    const url = range ? `${this.topPagesUrl}?range=${range}` : this.topPagesUrl;
    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map((response) => (response.success ? response.data : [])),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch top pages', error);
        return of([]);
      })
    );
  }

  getRecentEvents(limit = 20): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.eventsUrl}?limit=${limit}`).pipe(
      map((response) => (response.success ? response.data : [])),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch recent events', error);
        return of([]);
      })
    );
  }

  getRealtime(minutes = 5): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.realtimeUrl}?minutes=${minutes}`).pipe(
      map((response) => (response.success ? response.data : { activeVisitors: 0, pages: [] })),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch realtime stats', error);
        return of({ activeVisitors: 0, pages: [] });
      })
    );
  }

  getHourlyStats(range?: string): Observable<any[]> {
    const url = range ? `${this.hourlyUrl}?range=${range}` : this.hourlyUrl;
    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map((response) => (response.success ? response.data : [])),
      catchError((error) => {
        this.logAnalyticsError('Failed to fetch hourly stats', error);
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
    if (!this.isBrowser) return 'desktop';
    if (window.matchMedia('(max-width: 768px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1024px)').matches) return 'tablet';
    return 'desktop';
  }

  private getSessionId(): string {
    if (!this.isBrowser) return '';
    const existing = localStorage.getItem(this.sessionKey);
    if (existing) return existing;
    const id = this.generateId();
    localStorage.setItem(this.sessionKey, id);
    return id;
  }

  private generateId(): string {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private logAnalyticsError(message: string, error: unknown): void {
    if (!environment.production) {
      console.warn(`[Analytics] ${message}`, error);
    }
  }
}
