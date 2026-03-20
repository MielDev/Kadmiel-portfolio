import { Component, AfterViewInit, ElementRef, ViewChild, Inject, PLATFORM_ID, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalyticsService } from '../../services/analytics.service';
import { ProjectService } from '../../services/project.service';
import { MessageService } from '../../services/message.service';
import { forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trafficChart') trafficChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spark1') spark1Canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spark2') spark2Canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spark3') spark3Canvas!: ElementRef<HTMLCanvasElement>;

  stats = [
    { label: 'Visiteurs ce mois', value: 0, trend: '0%', trendUp: true, icon: 'ri-eye-line', color: '#38BDF8', glow: 'rgba(56,189,248,.3)', sparkId: 'spark1' },
    { label: 'Messages reçus', value: 0, trend: '0', trendUp: true, icon: 'ri-mail-line', color: '#FF3B3B', glow: 'rgba(255,59,59,.35)', sparkId: 'spark2' },
    { label: 'Projets publiés', value: 0, trend: '0', trendUp: true, icon: 'ri-rocket-2-line', color: '#7C3AED', glow: 'rgba(124,58,237,.35)', sparkId: 'spark3' }
  ];

  displayedStats: number[] = [0, 0, 0];
  messages: any[] = [];
  activities: any[] = [];
  projects: any[] = [];
  
  // Analytics details
  trafficSources: any[] = [];
  visitorCountries: any[] = [];
  dailyStats: any[] = [];
  overview: any = null;
  
  donutOffsets: number[] = [];
  donutDashArrays: string[] = [];
  totalVisits = 0;

  private subs = new Subscription();
  isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private analyticsService: AnalyticsService,
    private projectService: ProjectService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Initialisation gérée après le chargement des données
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadData(): void {
    const dataSub = forkJoin({
      overview: this.analyticsService.getOverview(),
      daily: this.analyticsService.getDailyStats(),
      sources: this.analyticsService.getSources(),
      countries: this.analyticsService.getCountries(),
      projects: this.projectService.getProjects(),
      messages: this.messageService.getMessages()
    }).subscribe({
      next: (res) => {
        this.overview = res.overview || {};
        this.dailyStats = res.daily || [];
        this.trafficSources = res.sources || [];
        this.visitorCountries = res.countries || [];
        this.projects = (res.projects || []).slice(0, 5);
        this.messages = (res.messages || []).slice(0, 5).map(m => ({
          ...m,
          initial: (m.name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
          color: this.getRandomGradient(),
          time: this.formatTime(m.created_at || new Date().toISOString())
        }));
        
        this.processStats(this.overview, res.projects || [], res.messages || []);
        this.generateActivities(res.projects || [], res.messages || []);
        this.cdr.detectChanges();

        if (this.isBrowser) {
          setTimeout(() => {
            this.initCounters();
            this.drawCharts();
            this.initDonut();
            this.cdr.detectChanges();
          }, 100);
        }
      },
      error: (err) => console.error('Error loading dashboard data', err)
    });
    this.subs.add(dataSub);
  }

  private processStats(overview: any, projects: any[], messages: any[]): void {
    this.totalVisits = overview?.totalViews || 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const dayOfMonth = now.getDate();
    
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(now.getMonth() - 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    // 1. Visiteurs uniques et tendance (MoM - Month to Date)
    this.stats[0].value = overview?.uniqueVisitors || 0;
    
    if (this.dailyStats && this.dailyStats.length > 0) {
      // Vues du mois en cours (jusqu'à aujourd'hui)
      const curMonthViews = this.dailyStats
        .filter(d => {
          const dDate = new Date(d.date);
          return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
        })
        .reduce((acc, d) => acc + (d.views || 0), 0);

      // Vues du mois précédent (jusqu'au même jour du mois)
      const prevMonthViews = this.dailyStats
        .filter(d => {
          const dDate = new Date(d.date);
          return dDate.getMonth() === prevMonth && 
                 dDate.getFullYear() === prevYear && 
                 dDate.getDate() <= dayOfMonth;
        })
        .reduce((acc, d) => acc + (d.views || 0), 0);

      if (prevMonthViews > 0) {
        const trend = ((curMonthViews - prevMonthViews) / prevMonthViews) * 100;
        this.stats[0].trend = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`;
        this.stats[0].trendUp = trend >= 0;
      } else {
        // Règle demandée : +100% si 0 le mois passé et >= 1 ce mois-ci
        this.stats[0].trend = curMonthViews > 0 ? '+100%' : '0%';
        this.stats[0].trendUp = curMonthViews > 0;
      }
    }
    
    // 2. Messages et tendance (MoM)
    this.stats[1].value = messages.length;
    const filterByMonth = (data: any[], month: number, year: number, upToDay?: number) => {
      return data.filter(item => {
        const d = new Date(item.created_at || item.visited_at);
        const matchesMonth = d.getMonth() === month && d.getFullYear() === year;
        if (!matchesMonth) return false;
        return upToDay ? d.getDate() <= upToDay : true;
      }).length;
    };

    const curMonthMsgs = filterByMonth(messages, currentMonth, currentYear);
    const prevMonthMsgs = filterByMonth(messages, prevMonth, prevYear, dayOfMonth);
    
    if (prevMonthMsgs > 0) {
      const trend = ((curMonthMsgs - prevMonthMsgs) / prevMonthMsgs) * 100;
      this.stats[1].trend = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`;
      this.stats[1].trendUp = trend >= 0;
    } else {
      this.stats[1].trend = curMonthMsgs > 0 ? '+100%' : '0%';
      this.stats[1].trendUp = curMonthMsgs > 0;
    }
    
    // 3. Projets (MoM)
    this.stats[2].value = projects.length;
    const curMonthProjs = filterByMonth(projects, currentMonth, currentYear);
    const prevMonthProjs = filterByMonth(projects, prevMonth, prevYear, dayOfMonth);

    if (prevMonthProjs > 0) {
      const trend = ((curMonthProjs - prevMonthProjs) / prevMonthProjs) * 100;
      this.stats[2].trend = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`;
      this.stats[2].trendUp = trend >= 0;
    } else {
      this.stats[2].trend = curMonthProjs > 0 ? '+100%' : '0%';
      this.stats[2].trendUp = curMonthProjs > 0;
    }
  }

  private generateActivities(projects: any[], messages: any[]): void {
    const acts: any[] = [];
    projects.slice(0, 3).forEach(p => {
      acts.push({
        icon: 'ri-rocket-2-line',
        color: 'rgba(56,189,248,.12)',
        border: 'rgba(56,189,248,.2)',
        text: `Projet <strong>"${p.title}"</strong> mis à jour`,
        time: this.formatTime(p.updated_at || p.created_at || new Date().toISOString()),
        date: new Date(p.updated_at || p.created_at || new Date())
      });
    });
    messages.slice(0, 3).forEach(m => {
      acts.push({
        icon: 'ri-mail-line',
        color: 'rgba(255,59,59,.12)',
        border: 'rgba(255,59,59,.2)',
        text: `Message reçu de <strong>${m.name}</strong>`,
        time: this.formatTime(m.created_at || new Date().toISOString()),
        date: new Date(m.created_at || new Date())
      });
    });
    
    this.activities = acts.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);
  }

  private formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours} h`;
    return `il y a ${days} j`;
  }

  private getRandomGradient(): string {
    const gradients = [
      'linear-gradient(135deg,#7C3AED,#4F27C8)',
      'linear-gradient(135deg,#FF3B3B,#C0392B)',
      'linear-gradient(135deg,#38BDF8,#0284C7)',
      'linear-gradient(135deg,#22C55E,#15803D)',
      'linear-gradient(135deg,#FBBF24,#D97706)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  }

  private initCounters(): void {
    this.stats.forEach((stat, index) => {
      let current = 0;
      const target = stat.value;
      if (target === 0) {
        this.displayedStats[index] = 0;
        return;
      }
      const step = target / 60;
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        this.displayedStats[index] = Math.floor(current);
        this.cdr.detectChanges();
        if (current >= target) {
          this.displayedStats[index] = target;
          this.cdr.detectChanges();
          clearInterval(interval);
        }
      }, 16);
    });
  }

  private drawCharts(): void {
    this.drawTrafficChart();
    // Données sparklines basées sur dailyStats si possible, sinon simulées
    const sparkData = this.dailyStats.map(d => d.views).reverse() || [40, 55, 48, 70, 63, 80];
    this.drawSparkline(this.spark1Canvas, sparkData, '#38BDF8');
    this.drawSparkline(this.spark2Canvas, [2, 3, 1, 4, 3, 5, 4, 6, 7, 8], '#FF3B3B');
    this.drawSparkline(this.spark3Canvas, [3, 3, 3, 4, 4, 4, 4, 5, 5, 5], '#7C3AED');
  }

  private drawSparkline(canvasRef: ElementRef<HTMLCanvasElement> | undefined, data: number[], color: string): void {
    if (!canvasRef || !data || data.length < 2) return;
    const canvas = canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.parentElement?.offsetWidth || 200;
    const h = 50;
    canvas.width = w;
    canvas.height = h;

    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const pts = data.map((v, i) => ({
      x: i * (w / (data.length - 1 || 1)),
      y: h - (v - min) / (max - min || 1) * (h * .7) - .1 * h
    }));

    if (pts.length === 0) return;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color.replace(')', ',0.3)').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, h);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawTrafficChart(): void {
    if (!this.trafficChartCanvas || !this.dailyStats || this.dailyStats.length === 0) return;
    const canvas = this.trafficChartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.parentElement?.offsetWidth || 600;
    const h = 200;
    canvas.width = w;
    canvas.height = h;

    // Utiliser les données réelles de dailyStats
    const reversedDaily = [...this.dailyStats].reverse();
    const labels = reversedDaily.map(d => d.date ? new Date(d.date).getDate().toString() : '');
    const data = reversedDaily.map(d => d.views || 0);
    
    if (data.length === 0) return;

    const pad = { t: 15, r: 15, b: 30, l: 40 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;
    const maxV = Math.max(...data, 10);

    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ph * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.font = '9px JetBrains Mono,monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxV * i / 4).toString(), pad.l - 5, y + 3);
    }

    const drawArea = (d: number[], colorLine: string, colorFill: string) => {
      const pts = d.map((v, i) => ({ x: pad.l + i * pw / (d.length - 1 || 1), y: pad.t + ph * (1 - v / maxV) }));
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ph);
      grad.addColorStop(0, colorFill);
      grad.addColorStop(1, 'transparent');
      
      ctx.beginPath(); ctx.moveTo(pts[0].x, pad.t + ph);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, pad.t + ph);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cx = (pts[i - 1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = colorLine; ctx.lineWidth = 2; ctx.stroke();
      pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fillStyle = colorLine; ctx.fill(); });
    };

    drawArea(data, '#FF3B3B', 'rgba(255,59,59,0.2)');

    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.font = '9px JetBrains Mono,monospace';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => {
      const x = pad.l + i * pw / (labels.length - 1 || 1);
      if (i % Math.ceil(labels.length / 10) === 0) ctx.fillText(l, x, h - 8);
    });
  }

  private initDonut(): void {
    if (!this.trafficSources || this.trafficSources.length === 0) return;
    
    const total = this.trafficSources.reduce((acc, s) => acc + (s.count || 0), 0);
    if (total === 0) return;
    
    const svgTotal = 314; // Circumference
    let currentOffset = 0;
    
    this.donutDashArrays = [];
    this.donutOffsets = [];
    
    this.trafficSources.forEach(s => {
      const perc = (s.count || 0) / total;
      const len = perc * svgTotal;
      this.donutDashArrays.push(`${len} ${svgTotal}`);
      this.donutOffsets.push(-currentOffset);
      currentOffset += len;
      s.percentage = Math.round(perc * 100);
    });
  }

  getCountryPerc(count: number): number {
    if (this.totalVisits === 0) return 0;
    return Math.round((count / this.totalVisits) * 100);
  }

  setRange(btn: any, range: string): void {}
}
