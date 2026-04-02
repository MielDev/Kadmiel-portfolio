import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../services/analytics.service';
import { forkJoin } from 'rxjs';

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
  private animationFrames: { [key: string]: number } = {};

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

  constructor(private analyticsService: AnalyticsService) {}

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
  }

  private startDataRefresh(): void {
    // Refresh overview and events every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadData(true); // true means "silent" (no full loading state)
    }, 30000);
  }

  private startRealtimeUpdate(): void {
    this.rtInterval = setInterval(() => {
      // 1. Update Realtime Chart
      this.rtData.shift();
      const fluctuation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      const newValue = Math.max(0, this.realtimeCount + fluctuation);
      this.rtData.push(newValue);
      this.drawRtChart();
      
      // 2. Simulate "live" ticking of the realtime count if it fluctuates
      if (Math.random() > 0.8) {
        const change = Math.random() > 0.5 ? 1 : -1;
        this.realtimeCount = Math.max(1, this.realtimeCount + change);
        this.animateTo('realtime', this.realtimeCount);
      }
    }, 2000);
  }

  loadData(isSilent: boolean = false): void {
    if (!isSilent) {
      this.isLoading = true;
    }
    this.errorMessage = null;
    
    // Map internal range to API format (7j -> 7d, 30j -> 30d, 90j -> 90d)
    const apiRange = this.currentRange.replace('j', 'd');

    forkJoin({
      overview: this.analyticsService.getOverview(apiRange),
      daily: this.analyticsService.getDailyStats(apiRange),
      sources: this.analyticsService.getSources(apiRange),
      countries: this.analyticsService.getCountries(apiRange),
      devices: this.analyticsService.getDevices(apiRange),
      browsers: this.analyticsService.getBrowsers(apiRange),
      topPages: this.analyticsService.getTopPages(apiRange),
      events: this.analyticsService.getRecentEvents()
    }).subscribe({
      next: (res) => {
        this.overview = res.overview;
        this.dailyStats = res.daily;
        this.sources = res.sources;
        this.countries = res.countries;
        this.totalVisits = this.overview?.totalViews || this.sources.reduce((acc, s) => acc + s.count, 0);
        this.animateTo('total', this.totalVisits);
        
        this.processKpiStats();
        this.processGeoStats();
        this.processDeviceAndBrowserStats(res.devices, res.browsers);
        this.processTopPagesAndEvents(res.topPages, res.events);
        
        this.isLoading = false;
        setTimeout(() => this.drawCharts(), 250);
      },
      error: (err) => {
        console.error('Error loading analytics data', err);
        this.errorMessage = "Impossible de charger les statistiques. Veuillez réessayer plus tard.";
        this.isLoading = false;
      }
    });
  }

  setRange(range: string): void {
    if (this.currentRange === range) return;
    this.currentRange = range;
    this.loadData();
  }

  private processKpiStats(): void {
    if (!this.overview) return;
    
    // Animate numbers
    this.animateTo('visitors', this.overview.uniqueVisitors || 0);
    this.animateTo('views', this.overview.totalViews || 0);
    this.animateTo('bounce', this.overview.bounceRate || 0);

    // Format duration
    const seconds = this.overview.avgSessionDuration || 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const cleanTrend = (t: string) => t ? t.replace('+', '').replace('-', '') : '0.0%';

    this.kpiStats = [
      { 
        label: 'Visiteurs uniques', 
        value: this.animatedValues['visitors'], 
        trend: cleanTrend(this.overview.uniqueVisitorsTrend), 
        trendUp: this.overview.uniqueVisitorsTrendUp !== false, 
        icon: '👁', 
        color: '#38BDF8', 
        sparkId: 'spark1' 
      },
      { 
        label: 'Pages vues', 
        value: this.animatedValues['views'], 
        trend: cleanTrend(this.overview.totalViewsTrend), 
        trendUp: this.overview.totalViewsTrendUp !== false, 
        icon: '📄', 
        color: '#FF3B3B', 
        sparkId: 'spark2' 
      },
      { 
        label: 'Durée moy. session', 
        value: durationStr, 
        trend: cleanTrend(this.overview.avgSessionDurationTrend), 
        trendUp: this.overview.avgSessionDurationTrendUp !== false, 
        icon: '⏱', 
        color: '#7C3AED', 
        sparkId: 'spark3' 
      },
      { 
        label: 'Taux de rebond', 
        value: this.animatedValues['bounce'] + '%', 
        trend: cleanTrend(this.overview.bounceRateTrend), 
        trendUp: this.overview.bounceRateTrendUp === false, // Une baisse (false) est bonne pour le rebond
        icon: '📉', 
        color: '#FBBF24', 
        sparkId: 'spark4' 
      }
    ];
  }

  private animateTo(key: string, target: number): void {
    if (this.animationFrames[key]) {
      cancelAnimationFrame(this.animationFrames[key]);
    }

    const current = this.animatedValues[key];
    const diff = target - current;
    if (diff === 0) return;

    const duration = 1500; // 1.5s
    const start = Date.now();

    const update = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      this.animatedValues[key] = Math.floor(current + (target - current) * ease);

      if (key !== 'realtime') {
        this.processKpiStatsSilent();
      }

      if (progress < 1) {
        this.animationFrames[key] = requestAnimationFrame(update);
      } else {
        delete this.animationFrames[key];
      }
    };
    this.animationFrames[key] = requestAnimationFrame(update);
  }

  private processKpiStatsSilent(): void {
    if (!this.overview) return;
    
    // Only update the display values in the existing kpiStats array
    this.kpiStats[0].value = this.animatedValues['visitors'];
    this.kpiStats[1].value = this.animatedValues['views'];
    this.kpiStats[3].value = this.animatedValues['bounce'] + '%';
  }

  private processGeoStats(): void {
    if (!this.countries) return;
    const total = this.countries.reduce((acc, c) => acc + c.count, 0);
    this.geoStats = this.countries.slice(0, 5).map(c => {
      const countryCode = this.getCountryCode(c.country);
      return {
        flag: this.getFlagEmoji(c.country),
        flagUrl: countryCode ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` : null,
        name: c.country || 'Inconnu',
        pct: total > 0 ? Math.round((c.count / total) * 100) : 0,
        count: c.count
      };
    });
  }

  private processDeviceAndBrowserStats(devices: any[] = [], browsers: any[] = []): void {
    const deviceMap: any = {
      'desktop': { icon: '💻', name: 'Desktop', color: 'linear-gradient(90deg,#7C3AED,#FF3B3B)' },
      'mobile': { icon: '📱', name: 'Mobile', color: 'linear-gradient(90deg,#38BDF8,#7C3AED)' },
      'tablet': { icon: '📟', name: 'Tablette', color: 'linear-gradient(90deg,#FBBF24,#FB923C)' }
    };

    const totalDevices = devices.reduce((acc, d) => acc + d.count, 0);
    this.deviceStats = devices.map(d => {
      const type = (d.device || 'desktop').toLowerCase();
      const config = deviceMap[type] || deviceMap['desktop'];
      return {
        ...config,
        pct: totalDevices > 0 ? Math.round((d.count / totalDevices) * 100) : 0
      };
    });

    const browserIcons: any = {
      'Chrome': '🌐',
      'Firefox': '🦊',
      'Safari': '🧭',
      'Edge': '🟦',
      'Opera': '🅾️',
      'Autre': '❓'
    };

    const totalBrowsers = browsers.reduce((acc, b) => acc + b.count, 0);
    this.browserStats = browsers.map(b => ({
      icon: browserIcons[b.browser] || '🌐',
      name: b.browser,
      pct: totalBrowsers > 0 ? Math.round((b.count / totalBrowsers) * 100) : 0
    }));
  }

  private processTopPagesAndEvents(pages: any[] = [], events: any[] = []): void {
    this.topPages = pages.map((p, i) => {
      // Simulate trends based on position and views if not provided by backend
      const isUp = (i % 2 === 0) || (p.views > 10);
      const randomTrend = (Math.random() * 15 + 2).toFixed(1) + '%';
      
      return {
        id: i + 1,
        path: p.path,
        views: p.views,
        time: '1:45',
        trend: randomTrend,
        trendUp: isUp
      };
    });

    const eventIcons: any = {
      'pageview': '👁',
      'click': '🖱',
      'contact_submit': '✉️',
      'contact_success': '✅',
      'contact_error': '❌'
    };

    this.events = events.map(e => ({
      icon: eventIcons[e.event_type] || '⚡',
      text: this.formatEventText(e),
      time: this.formatTimeAgo(e.visited_at),
      flag: this.getFlagEmoji(e.country)
    }));
    
    // Simple realtime estimation: count unique IPs in last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60000);
    const recentUniqueUsers = new Set(
      events
        .filter(e => new Date(e.visited_at) > fiveMinAgo)
        .map(e => e.ip)
    ).size;

    this.realtimeCount = Math.max(recentUniqueUsers, 1); // At least 1 (the current user)
    this.animateTo('realtime', this.realtimeCount);
    
    // Group recent paths
    const pathCounts: { [key: string]: number } = {};
    events.slice(0, 10).forEach(e => {
      pathCounts[e.path] = (pathCounts[e.path] || 0) + 1;
    });

    this.realtimePages = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }

  private formatEventText(e: any): string {
    const flag = this.getFlagEmoji(e.country);
    const countryStr = e.country ? ` (${flag} ${e.country})` : '';
    
    switch(e.event_type) {
      case 'pageview': return `Vue de la page ${e.path}${countryStr}`;
      case 'contact_success': return `Message envoyé avec succès${countryStr}`;
      case 'contact_submit': return `Tentative d'envoi de message${countryStr}`;
      default: return `Action ${e.event_type} sur ${e.path}${countryStr}`;
    }
  }

  private formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
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

  private getFlagEmoji(country: string): string {
    if (!country) return '🌍';
    if (/\p{Emoji}/u.test(country)) return country;
    const finalCode = this.getCountryCode(country);
    if (!finalCode) return '🌍';
    const codePoints = finalCode.split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  // Donut helpers
  getDonutStroke(count: number): string {
    if (this.totalVisits === 0) return '0 283';
    const pct = count / this.totalVisits;
    const dash = pct * 283; // 2 * PI * r (r=45)
    return `${dash} 283`;
  }

  getDonutRotation(index: number): string {
    let prevTotal = 0;
    for (let i = 0; i < index; i++) {
      prevTotal += this.sources[i].count;
    }
    const deg = (prevTotal / this.totalVisits) * 360 - 90;
    return `rotate(${deg} 60 60)`;
  }

  getSourcePct(count: number): number {
    if (this.totalVisits === 0) return 0;
    return Math.round((count / this.totalVisits) * 100);
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
      requestAnimationFrame(animateRing);
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

    const dpr = window.devicePixelRatio || 1;
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

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (cellW + gap);
        const y = r * (cellH + gap);
        
        // Generate a more "realistic" pattern based on hour and day
        // More traffic in afternoon/evening, less at night
        const hourFactor = Math.sin((c - 6) * Math.PI / 12) * 0.5 + 0.5;
        const dayFactor = (r >= 5) ? 1.2 : 0.8; // More traffic on weekends
        const randomFactor = Math.random() * 0.3;
        
        const intensity = Math.min(1, (hourFactor * dayFactor) + randomFactor);
        
        ctx.fillStyle = `rgba(124, 58, 237, ${intensity * 0.85 + 0.05})`;
        
        // Rounded cell
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
    const dpr = window.devicePixelRatio || 1;
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
    let maxViewsVal = Math.max(...points.map(d => d.views), 10);
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
    const avgViews = points.reduce((acc, p) => acc + p.views, 0) / points.length;
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
    ctx.lineTo(getX(0), getY(points[0].views));
    
    // Draw curves across data points
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(points[i].views);
      const x2 = getX(i + 1);
      const y2 = getY(points[i+1].views);
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
    ctx.moveTo(getX(0), getY(points[0].views));
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(points[i].views);
      const x2 = getX(i + 1);
      const y2 = getY(points[i+1].views);
      const cx = (x1 + x2) / 2;
      ctx.bezierCurveTo(cx, y1, cx, y2, x2, y2);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // --- 4. Draw Points & Tooltips ---
    points.forEach((p, i) => {
      const x = getX(i);
      const y = getY(p.views);
      
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

    const w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    ctx.clearRect(0, 0, displayW, displayH);

    const bars = this.rtData.length;
    const barGap = 4;
    const barW = (displayW - (bars - 1) * barGap) / bars;
    const maxVal = Math.max(...this.rtData, 5);

    this.rtData.forEach((val, i) => {
      const barH = (val / maxVal) * (displayH - 10) + 2;
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

      const w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
      const h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      const displayW = canvas.clientWidth;
      const displayH = canvas.clientHeight;

      // Use dailyStats views for sparks if it's the Views KPI
      let data: number[] = [];
      if (stat.label === 'Pages vues' && this.dailyStats.length > 0) {
        data = this.dailyStats.slice(-10).map(d => d.views);
      } else {
        // Fallback or other KPIs: generate stable random-looking data based on value
        const seed = stat.label.length;
        data = Array.from({ length: 10 }, (_, i) => {
          const val = Math.sin(i + seed) * 10 + 20;
          return val;
        });
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
}
