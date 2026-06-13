import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../services/analytics.service';
import { Observable, Subscription, take } from 'rxjs';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cur') cur!: ElementRef;
  @ViewChild('curRing') curRing!: ElementRef;
  @ViewChild('trafficChart') trafficChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rtChart') rtChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('heatmapCanvas') heatmapCanvas!: ElementRef<HTMLCanvasElement>;

  // Charts & Animation
  private rtData: number[] = Array(20).fill(0);
  private rtInterval: any;
  private refreshInterval: any;
  private cursorFrame: number | null = null;
  private animationFrames: { [key: string]: number } = {};
  private dataSubscriptions: Subscription[] = [];

  currentTime: string = '00:00:00';
  private clockInterval: any;
  currentRange: string = '30j';
  isLoading: boolean = true;
  errorMessage: string | null = null;

  // Stats Data
  kpiStats: any[] = [];
  geoStats: any[] = [];
  deviceStats: any[] = [];
  browserStats: any[] = [];
  topPages: any[] = [];
  events: any[] = [];
  realtimeCount: number = 0;
  realtimePages: any[] = [];

  // Data from service
  overview: any = null;
  dailyStats: any[] = [];
  sources: any[] = [];
  countries: any[] = [];
  totalVisits: number = 0;
  hourlyStats: any[] = [];
  maxTopPageViews: number = 0;
  
  // Animated Display Values
  animatedValues: { [key: string]: number } = {
    visitors: 0,
    views: 0,
    bounce: 0,
    realtime: 0,
    total: 0
  };

  // Cursor logic
  private mx = 0; private my = 0;
  private rx = 0; private ry = 0;

  constructor(private analyticsService: AnalyticsService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.startClock();
    this.loadData();
    this.startRealtimeUpdate();
    this.startDataRefresh();
  }

  ngAfterViewInit(): void {
    this.initCursorAnimation();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.rtInterval) clearInterval(this.rtInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.cursorFrame !== null) this.cancelFrame(this.cursorFrame);
    Object.values(this.animationFrames).forEach((frameId) => this.cancelFrame(frameId));
    this.clearDataSubscriptions();
  }

  private startDataRefresh(): void {
    // Refresh overview and events every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadData(true); // true means "silent" (no full loading state)
    }, 30000);
  }

  private startRealtimeUpdate(): void {
    this.rtInterval = setInterval(() => {
      this.rtData.shift();
      this.rtData.push(this.realtimeCount);
      this.drawRtChart();
    }, 2000);
  }

  loadData(isSilent: boolean = false): void {
    if (!isSilent) {
      this.isLoading = true;
    }
    this.errorMessage = null;
    
    // Map internal range to API format (7j -> 7d, 30j -> 30d, 90j -> 90d)
    const apiRange = this.currentRange.replace('j', 'd');

    this.clearDataSubscriptions();
    const res: Record<string, any> = {
      overview: null,
      daily: [],
      sources: [],
      countries: [],
      devices: [],
      browsers: [],
      topPages: [],
      events: [],
      realtime: { activeVisitors: 0, pages: [] },
      hourly: []
    };

    let pending = 0;
    let rendered = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const render = () => {
      if (rendered) return;
      rendered = true;
      if (timeoutId) clearTimeout(timeoutId);
      this.clearDataSubscriptions();

      try {
        this.overview = this.normalizeOverview(res['overview']);
        this.dailyStats = this.toArray(res['daily']);
        this.sources = this.toArray(res['sources']);
        this.countries = this.toArray(res['countries']);
        this.hourlyStats = this.toArray(res['hourly']);
        this.totalVisits = this.sumCounts(this.sources) || this.toNumber(this.overview.totalViews);
        this.animatedValues['total'] = this.totalVisits;

        this.processKpiStats();
        this.processGeoStats();
        this.processDeviceAndBrowserStats(this.toArray(res['devices']), this.toArray(res['browsers']));
        this.processTopPagesAndEvents(this.toArray(res['topPages']), this.toArray(res['events']), res['realtime']);
      } catch (error) {
        console.error('Error processing analytics data', error);
        this.errorMessage = 'Les statistiques ont ete recues, mais leur affichage a rencontre une erreur.';
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.drawCharts(), 250);
      }
    };

    const settle = () => {
      pending -= 1;
      if (pending <= 0) render();
    };

    const watch = (key: string, request$: Observable<any>) => {
      pending += 1;
      let settled = false;
      const sub = request$.pipe(take(1)).subscribe({
        next: (value) => {
          res[key] = value;
          if (!settled) {
            settled = true;
            settle();
          }
        },
        error: (err) => {
          console.error(`Error loading analytics ${key}`, err);
          if (!settled) {
            settled = true;
            settle();
          }
        }
      });
      this.dataSubscriptions.push(sub);
    };

    timeoutId = setTimeout(render, 12000);
    watch('overview', this.analyticsService.getOverview(apiRange));
    watch('daily', this.analyticsService.getDailyStats(apiRange));
    watch('sources', this.analyticsService.getSources(apiRange));
    watch('countries', this.analyticsService.getCountries(apiRange));
    watch('devices', this.analyticsService.getDevices(apiRange));
    watch('browsers', this.analyticsService.getBrowsers(apiRange));
    watch('topPages', this.analyticsService.getTopPages(apiRange));
    watch('events', this.analyticsService.getRecentEvents(30));
    watch('realtime', this.analyticsService.getRealtime(5));
    watch('hourly', this.analyticsService.getHourlyStats(apiRange));
  }

  setRange(range: string): void {
    if (this.currentRange === range) return;
    this.currentRange = range;
    this.loadData();
  }

  private processKpiStats(): void {
    if (!this.overview) return;

    const uniqueVisitors = this.toNumber(this.overview.uniqueVisitors);
    const totalViews = this.toNumber(this.overview.totalViews);
    const bounceRate = this.toNumber(this.overview.bounceRate);
    this.animatedValues['visitors'] = uniqueVisitors;
    this.animatedValues['views'] = totalViews;
    this.animatedValues['bounce'] = bounceRate;

    // Format duration
    const seconds = Math.max(0, Math.round(this.toNumber(this.overview.avgSessionDuration)));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const cleanTrend = (t: unknown) => String(t || '0.0%').replace('+', '').replace('-', '');

    this.kpiStats = [
      {
        label: 'Visiteurs uniques',
        value: uniqueVisitors,
        trend: cleanTrend(this.overview.uniqueVisitorsTrend),
        trendUp: this.overview.uniqueVisitorsTrendUp !== false,
        icon: 'fa-solid fa-eye',
        color: '#38BDF8',
        sparkId: 'spark1'
      },
      {
        label: 'Pages vues',
        value: totalViews,
        trend: cleanTrend(this.overview.totalViewsTrend),
        trendUp: this.overview.totalViewsTrendUp !== false,
        icon: 'fa-solid fa-file-lines',
        color: '#FF3B3B',
        sparkId: 'spark2'
      },
      {
        label: 'Durée moy. session',
        value: durationStr,
        trend: cleanTrend(this.overview.avgSessionDurationTrend),
        trendUp: this.overview.avgSessionDurationTrendUp !== false,
        icon: 'fa-solid fa-clock',
        color: '#7C3AED',
        sparkId: 'spark3'
      },
      {
        label: 'Taux de rebond',
        value: bounceRate + '%',
        trend: cleanTrend(this.overview.bounceRateTrend),
        trendUp: this.overview.bounceRateTrendUp === false, // Une baisse (false) est bonne pour le rebond
        icon: 'fa-solid fa-chart-line',
        color: '#FBBF24',
        sparkId: 'spark4'
      }
    ];
  }

  private animateTo(key: string, target: number): void {
    if (this.animationFrames[key]) {
      this.cancelFrame(this.animationFrames[key]);
    }

    const current = this.toNumber(this.animatedValues[key]);
    const safeTarget = this.toNumber(target);
    const diff = safeTarget - current;
    if (diff === 0) return;

    const duration = 1500; // 1.5s
    const start = Date.now();

    const update = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      this.animatedValues[key] = Math.floor(current + (safeTarget - current) * ease);

      if (key !== 'realtime') {
        this.processKpiStatsSilent();
      }

      if (progress < 1) {
        this.animationFrames[key] = this.requestFrame(update);
      } else {
        delete this.animationFrames[key];
      }
    };
    this.animationFrames[key] = this.requestFrame(update);
  }

  private processKpiStatsSilent(): void {
    if (!this.overview || this.kpiStats.length < 4) return;
    
    // Only update the display values in the existing kpiStats array
    this.kpiStats[0].value = this.animatedValues['visitors'];
    this.kpiStats[1].value = this.animatedValues['views'];
    this.kpiStats[3].value = this.animatedValues['bounce'] + '%';
  }

  private processGeoStats(): void {
    if (!this.countries) return;
    const total = this.sumCounts(this.countries);
    this.geoStats = this.countries.slice(0, 5).map(c => {
      const countryCode = this.getCountryCode(c.country);
      const count = this.toNumber(c.count);
      return {
        flag: this.getFlagIcon(c.country),
        flagUrl: countryCode ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` : null,
        name: c.country || 'Inconnu',
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        count
      };
    });
  }

  private processDeviceAndBrowserStats(devices: any[] = [], browsers: any[] = []): void {
    const deviceMap: any = {
      'desktop': { icon: 'fa-solid fa-desktop', name: 'Desktop', color: 'linear-gradient(90deg,#7C3AED,#FF3B3B)' },
      'mobile': { icon: 'fa-solid fa-mobile-screen-button', name: 'Mobile', color: 'linear-gradient(90deg,#38BDF8,#7C3AED)' },
      'tablet': { icon: 'fa-solid fa-tablet-screen-button', name: 'Tablette', color: 'linear-gradient(90deg,#FBBF24,#FB923C)' }
    };

    const totalDevices = this.sumCounts(devices);
    this.deviceStats = devices.map(d => {
      const type = (d.device || 'desktop').toLowerCase();
      const config = deviceMap[type] || deviceMap['desktop'];
      const count = this.toNumber(d.count);
      return {
        ...config,
        pct: totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0
      };
    });

    const browserIcons: any = {
      'Chrome': 'fa-brands fa-chrome',
      'Firefox': 'fa-brands fa-firefox-browser',
      'Safari': 'fa-brands fa-safari',
      'Edge': 'fa-brands fa-edge',
      'Opera': 'fa-brands fa-opera',
      'Autre': 'fa-solid fa-globe'
    };

    const totalBrowsers = this.sumCounts(browsers);
    this.browserStats = browsers.map(b => ({
      icon: browserIcons[b.browser] || 'fa-solid fa-globe',
      name: b.browser || 'Autre',
      pct: totalBrowsers > 0 ? Math.round((this.toNumber(b.count) / totalBrowsers) * 100) : 0
    }));
  }

  private processTopPagesAndEvents(pages: any[] = [], events: any[] = [], realtime: any = null): void {
    this.maxTopPageViews = Math.max(...pages.map(p => this.toNumber(p.views)), 0);
    this.topPages = pages.map((p, i) => {
      const views = this.toNumber(p.views);

      return {
        id: i + 1,
        path: p.path || '/',
        views,
        share: this.maxTopPageViews > 0 ? Math.round((views / this.maxTopPageViews) * 100) : 0
      };
    });

    const eventIcons: any = {
      'pageview': 'fa-solid fa-eye',
      'click': 'fa-solid fa-computer-mouse',
      'contact_submit': 'fa-solid fa-envelope',
      'contact_success': 'fa-solid fa-circle-check',
      'contact_error': 'fa-solid fa-circle-xmark'
    };

    this.events = events.map(e => ({
      icon: eventIcons[e.event_type] || 'fa-solid fa-bolt',
      text: this.formatEventText(e),
      time: this.formatTimeAgo(e.visited_at),
      country: e.country,
      source: e.source,
      device: e.device,
      flag: 'fa-solid fa-globe'
    }));

    this.realtimeCount = Math.max(0, this.toNumber(realtime?.activeVisitors));
    this.animateTo('realtime', this.realtimeCount);
    this.rtData = this.rtData.map(() => this.realtimeCount);
    this.realtimePages = this.toArray(realtime?.pages);
  }

  private formatEventText(e: any): string {
    const countryStr = e.country ? ` (${e.country})` : '';
    
    switch(e.event_type) {
      case 'pageview': return `Vue de la page ${e.path}${countryStr}`;
      case 'contact_success': return `Message envoyé avec succès${countryStr}`;
      case 'contact_submit': return `Tentative d'envoi de message${countryStr}`;
      default: return `Action ${e.event_type} sur ${e.path}${countryStr}`;
    }
  }

  private formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'Date inconnue';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    return date.toLocaleDateString('fr-FR');
  }

  public getCountryCode(country: string): string | null {
    if (!country) return null;
    const code = country.toUpperCase();
    
    const nameToCode: { [key: string]: string } = {
      'FRANCE': 'FR',
      'BELGIQUE': 'BE',
      'SUISSE': 'CH',
      'CANADA': 'CA',
      'USA': 'US',
      'UNITED STATES': 'US',
      'MAROC': 'MA',
      'ALGÉRIE': 'DZ',
      'TUNISIE': 'TN',
      'SÉNÉGAL': 'SN',
      'CÔTE D\'IVOIRE': 'CI',
      'CONGO': 'CG',
      'CAMEROUN': 'CM',
      'BÉNIN': 'BJ',
      'BENIN': 'BJ'
    };

    return nameToCode[code] || (code.length === 2 ? code : null);
  }

  private getFlagIcon(country: string): string {
    return 'fa-solid fa-globe';
  }

  // Donut helpers
  getDonutStroke(count: number): string {
    const total = Math.max(Number(this.totalVisits) || 0, 0);
    if (total === 0) return '0 283';
    const pct = (Number(count) || 0) / total;
    const dash = pct * 283; // 2 * PI * r (r=45)
    return `${dash} 283`;
  }

  getDonutRotation(index: number): string {
    if (!this.totalVisits) return 'rotate(-90 60 60)';
    let prevTotal = 0;
    for (let i = 0; i < index; i++) {
      prevTotal += this.toNumber(this.sources[i]?.count);
    }
    const deg = (prevTotal / this.totalVisits) * 360 - 90;
    return `rotate(${deg} 60 60)`;
  }

  getSourcePct(count: number): number {
    if (!this.totalVisits) return 0;
    return Math.round((this.toNumber(count) / this.totalVisits) * 100);
  }

  getTopPageWidth(page: any): string {
    if (!this.maxTopPageViews) return '0%';
    return `${Math.round((this.toNumber(page?.views) / this.maxTopPageViews) * 100)}%`;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mx = e.clientX;
    this.my = e.clientY;
    if (this.cur) {
      this.cur.nativeElement.style.left = this.mx + 'px';
      this.cur.nativeElement.style.top = this.my + 'px';
    }

    const target = e.target as HTMLElement;
    const isHoverable = target.closest('a, button, .kpi-card, .panel, .user-card');
    if (this.curRing) {
      if (isHoverable) {
        this.curRing.nativeElement.style.width = '40px';
        this.curRing.nativeElement.style.height = '40px';
        this.curRing.nativeElement.style.borderColor = 'var(--red)';
      } else {
        this.curRing.nativeElement.style.width = '28px';
        this.curRing.nativeElement.style.height = '28px';
        this.curRing.nativeElement.style.borderColor = 'var(--violet)';
      }
    }
  }

  private initCursorAnimation(): void {
    const animateRing = () => {
      this.rx += (this.mx - this.rx) * 0.12;
      this.ry += (this.my - this.ry) * 0.12;
      if (this.curRing) {
        this.curRing.nativeElement.style.left = this.rx + 'px';
        this.curRing.nativeElement.style.top = this.ry + 'px';
      }
      this.cursorFrame = this.requestFrame(animateRing);
    };
    animateRing();
  }

  private startClock(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date().toLocaleTimeString('fr-FR');
    }, 1000);
  }

  private drawCharts(): void {
    this.drawTrafficChart();
    this.drawSparklines();
    this.drawHeatmap();
    this.drawRtChart();
  }

  private drawHeatmap(): void {
    if (!this.heatmapCanvas) return;
    const canvas = this.heatmapCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = this.getPixelRatio();
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const displayW = rect.width;
    const displayH = rect.height;

    ctx.clearRect(0, 0, displayW, displayH);

    const rows = 7; // Days
    const cols = 24; // Hours
    const gap = 4;
    const cellW = (displayW - (cols - 1) * gap) / cols;
    const cellH = (displayH - (rows - 1) * gap) / rows;

    const countMap = new Map<string, number>();
    this.hourlyStats.forEach((item) => {
      countMap.set(`${this.toNumber(item.weekday)}:${this.toNumber(item.hour)}`, this.toNumber(item.count));
    });
    const maxCount = Math.max(...Array.from(countMap.values()), 0);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (cellW + gap);
        const y = r * (cellH + gap);
        const count = countMap.get(`${r}:${c}`) || 0;
        const intensity = maxCount > 0 ? count / maxCount : 0;

        ctx.fillStyle = intensity > 0
          ? `rgba(124, 58, 237, ${intensity * 0.85 + 0.12})`
          : 'rgba(255, 255, 255, 0.035)';

        this.roundRect(ctx, x, y, cellW, cellH, 3);
        ctx.fill();
      }
    }
  }

  private drawTrafficChart(): void {
    if (!this.trafficChart || !this.dailyStats.length) return;
    const canvas = this.trafficChart.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset dimensions for retina displays
    const dpr = this.getPixelRatio();
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const displayW = rect.width;
    const displayH = rect.height;

    ctx.clearRect(0, 0, displayW, displayH);

    const points = this.dailyStats.slice(-15);
    if (points.length < 2) return;

    // Stabilize Y axis: round up max views to nearest 10 or 50
    let maxViewsVal = Math.max(...points.map(d => this.toNumber(d.views)), 10);
    const roundTo = maxViewsVal > 100 ? 50 : 10;
    const maxViews = Math.ceil((maxViewsVal * 1.3) / roundTo) * roundTo;

    const getX = (i: number) => (i / (points.length - 1)) * displayW;
    const getY = (v: number) => displayH - (v / maxViews) * (displayH - 40) - 20;

    // --- 1. Draw Grid Lines ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i <= 3; i++) {
      const y = getY((maxViews / 3) * i);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayW, y);
      ctx.stroke();
    }

    // --- 1b. Draw Average Line (Moyenne) ---
    const avgViews = points.reduce((acc, p) => acc + this.toNumber(p.views), 0) / points.length;
    const avgY = getY(avgViews);
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, avgY);
    ctx.lineTo(displayW, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- 2. Draw Area Gradient ---
    const areaGrad = ctx.createLinearGradient(0, 0, 0, displayH);
    areaGrad.addColorStop(0, 'rgba(124, 58, 237, 0.25)');
    areaGrad.addColorStop(0.6, 'rgba(124, 58, 237, 0.05)');
    areaGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = areaGrad;
    ctx.beginPath();
    
    // Start area from bottom-left
    ctx.moveTo(getX(0), displayH);
    // Line up to first point
    ctx.lineTo(getX(0), getY(this.toNumber(points[0].views)));
    
    // Draw curves across data points
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(this.toNumber(points[i].views));
      const x2 = getX(i + 1);
      const y2 = getY(this.toNumber(points[i+1].views));
      const cx = (x1 + x2) / 2;
      ctx.bezierCurveTo(cx, y1, cx, y2, x2, y2);
    }
    
    // Close area to bottom-right
    ctx.lineTo(getX(points.length - 1), displayH);
    ctx.closePath();
    ctx.fill();

    // --- 3. Draw Main Line ---
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(124, 58, 237, 0.4)';
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(this.toNumber(points[0].views)));
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(this.toNumber(points[i].views));
      const x2 = getX(i + 1);
      const y2 = getY(this.toNumber(points[i+1].views));
      const cx = (x1 + x2) / 2;
      ctx.bezierCurveTo(cx, y1, cx, y2, x2, y2);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // --- 4. Draw Points & Tooltips ---
    points.forEach((p, i) => {
      const x = getX(i);
      const y = getY(this.toNumber(p.views));
      
      // Halo
      ctx.fillStyle = 'rgba(124, 58, 237, 0.15)';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7C3AED';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Date Labels (every 4 points)
      if (i % 4 === 0 || i === points.length - 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '500 9px Orbitron';
        ctx.textAlign = 'center';
        const date = new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        ctx.fillText(date, x, displayH - 4);
      }
    });
  }

  private drawRtChart(): void {
    if (!this.rtChart) return;
    const canvas = this.rtChart.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = this.getPixelRatio();
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    ctx.clearRect(0, 0, displayW, displayH);

    const bars = this.rtData.length;
    const barGap = 4;
    const barW = (displayW - (bars - 1) * barGap) / bars;
    const maxVal = Math.max(...this.rtData, 5);

    this.rtData.forEach((val, i) => {
      const barH = (this.toNumber(val) / maxVal) * (displayH - 10) + 2;
      const x = i * (barW + barGap);
      const y = displayH - barH;

      // Dynamic Gradient for each bar
      const grad = ctx.createLinearGradient(0, y, 0, displayH);
      grad.addColorStop(0, '#7C3AED');
      grad.addColorStop(1, '#FF3B3B');

      ctx.fillStyle = grad;
      // Rounded bar effect
      this.roundRect(ctx, x, y, barW, barH, 2);
      ctx.fill();

      // Top glow dot for active bars
      if (val > 0) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + barW/2, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private drawSparklines(): void {
    this.kpiStats.forEach(stat => {
      const canvas = document.getElementById(stat.sparkId) as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = this.getPixelRatio();
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      const displayW = canvas.clientWidth;
      const displayH = canvas.clientHeight;

      let data: number[] = [];
      if (this.dailyStats.length > 0) {
        data = this.dailyStats.slice(-10).map(d => Number(d.views) || 0);
      } else {
        const value = typeof stat.value === 'number' ? stat.value : parseFloat(String(stat.value)) || 0;
        data = Array(10).fill(value);
      }

      const max = Math.max(...data, 1);
      
      ctx.strokeStyle = stat.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * displayW;
        const y = displayH - (v / max) * (displayH - 10) - 5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  private clearDataSubscriptions(): void {
    this.dataSubscriptions.forEach((sub) => sub.unsubscribe());
    this.dataSubscriptions = [];
  }

  private toArray<T = any>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : [];
  }

  private toNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private sumCounts(items: any[]): number {
    return this.toArray(items).reduce((acc, item) => acc + this.toNumber(item?.count), 0);
  }

  private normalizeOverview(value: any): any {
    const overview = value && typeof value === 'object' ? value : {};
    return {
      totalViews: this.toNumber(overview.totalViews),
      totalViewsTrend: overview.totalViewsTrend || '0.0%',
      totalViewsTrendUp: overview.totalViewsTrendUp !== false,
      uniqueVisitors: this.toNumber(overview.uniqueVisitors),
      uniqueVisitorsTrend: overview.uniqueVisitorsTrend || '0.0%',
      uniqueVisitorsTrendUp: overview.uniqueVisitorsTrendUp !== false,
      avgSessionDuration: this.toNumber(overview.avgSessionDuration),
      avgSessionDurationTrend: overview.avgSessionDurationTrend || '0.0%',
      avgSessionDurationTrendUp: overview.avgSessionDurationTrendUp !== false,
      bounceRate: this.toNumber(overview.bounceRate),
      bounceRateTrend: overview.bounceRateTrend || '0.0%',
      bounceRateTrendUp: overview.bounceRateTrendUp !== false
    };
  }

  private requestFrame(callback: FrameRequestCallback): number {
    if (typeof requestAnimationFrame === 'function') {
      return requestAnimationFrame(callback);
    }
    const timer = typeof window !== 'undefined' ? window.setTimeout.bind(window) : setTimeout;
    return timer(() => callback(Date.now()), 16) as unknown as number;
  }

  private cancelFrame(frameId: number): void {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frameId);
      return;
    }
    const clearTimer = typeof window !== 'undefined' ? window.clearTimeout.bind(window) : clearTimeout;
    clearTimer(frameId);
  }

  private getPixelRatio(): number {
    return typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  }
}
