import { 
  Component, 
  OnInit, 
  AfterViewInit, 
  OnDestroy, 
  ElementRef, 
  Renderer2, 
  HostListener, 
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { ProjectService } from '../../services/project.service';
import { SkillService } from '../../services/skill.service';
import { ExperienceService } from '../../services/experience.service';
import { AboutService, About } from '../../services/about.service';
import { HeroService } from '../../services/hero.service';
import { MessageService } from '../../services/message.service';
import { TechnicalLevelService } from '../../services/technical-level.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SettingsService } from '../../services/settings.service';
import { Availability, AvailabilityService } from '../../services/availability.service';
import { Project } from '../../models/project.model';
import { Skill } from '../../models/skill.model';
import { Experience } from '../../models/experience.model';
import { TechnicalLevel } from '../../models/technical-level.model';
import { HeroData } from '../../models/hero.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly placeholderProjectImage = '/assets/placeholder-project.svg';

  private unlisteners: (() => void)[] = [];
  private trackedSections = new Set<string>();
  private maxScrollDepth = 0;
  private observer?: IntersectionObserver;

  // Data
  projects: Project[] = [];
  skills: Skill[] = [];
  experiences: Experience[] = [];
  technicalLevels: TechnicalLevel[] = [];
  aboutData: About | null = null;
  heroData: HeroData | null = null;
  availability: Availability | null = null;
  currentYear = new Date().getFullYear();

  // Loading states
  isLoadingProjects = true;
  isLoadingSkills = true;

  // Project filtering
  selectedTag = 'Tous';
  showBackToTop = false;

  // ── Theme system ──────────────────────────────────────────────
  isDark = true;
  showThemePanel = false;
  selectedPaletteIndex = 0;

  readonly palettes = [
    { name: 'Cyber',    primary: '#FF3B3B', secondary: '#7C3AED', icon: '🔴' },
    { name: 'Ocean',    primary: '#06B6D4', secondary: '#6366F1', icon: '🔵' },
    { name: 'Emerald',  primary: '#10B981', secondary: '#3B82F6', icon: '🟢' },
    { name: 'Sunset',   primary: '#F97316', secondary: '#EC4899', icon: '🟠' },
    { name: 'Gold',     primary: '#F59E0B', secondary: '#8B5CF6', icon: '🟡' },
  ];

  private darkVars = {
    '--bg': '#070B14',
    '--card-bg': '#0F172A',
    '--card-bg-2': '#1e293b',
    '--card-bg-3': '#090D1A',
    '--nav-bg': 'rgba(7,11,20,0.88)',
    '--text': '#FFFFFF',
    '--text-muted': '#9CA3AF',
    '--text-dim': '#6B7280',
    '--border': 'rgba(255,255,255,0.06)',
    '--border-md': 'rgba(255,255,255,0.08)',
    '--border-light': 'rgba(255,255,255,0.12)',
    '--mobile-menu-bg': 'rgba(7,11,20,0.97)',
    '--input-bg': '#0F172A',
    '--shadow-color': 'rgba(0,0,0,0.4)',
  };

  private lightVars = {
    '--bg': '#F8FAFC',
    '--card-bg': '#FFFFFF',
    '--card-bg-2': '#E2E8F0',
    '--card-bg-3': '#F1F5F9',
    '--nav-bg': 'rgba(248,250,252,0.92)',
    '--text': '#0F172A',
    '--text-muted': '#475569',
    '--text-dim': '#64748B',
    '--border': 'rgba(0,0,0,0.07)',
    '--border-md': 'rgba(0,0,0,0.1)',
    '--border-light': 'rgba(0,0,0,0.15)',
    '--mobile-menu-bg': 'rgba(248,250,252,0.98)',
    '--input-bg': '#F8FAFC',
    '--shadow-color': 'rgba(0,0,0,0.1)',
  };

  toggleDark(): void {
    this.isDark = !this.isDark;
    this.applyTheme();
  }

  selectPalette(index: number): void {
    this.selectedPaletteIndex = index;
    this.applyTheme();
  }

  toggleThemePanel(): void {
    this.showThemePanel = !this.showThemePanel;
  }

  applyTheme(): void {
    const root = document.documentElement;
    const modeVars = this.isDark ? this.darkVars : this.lightVars;
    const palette = this.palettes[this.selectedPaletteIndex];

    Object.entries(modeVars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.style.setProperty('--red', palette.primary);
    root.style.setProperty('--violet', palette.secondary);
    root.setAttribute('data-theme', this.isDark ? 'dark' : 'light');

    // Persist
    localStorage.setItem('kt-theme-dark', String(this.isDark));
    localStorage.setItem('kt-theme-palette', String(this.selectedPaletteIndex));
  }

  private loadSavedTheme(): void {
    const savedDark = localStorage.getItem('kt-theme-dark');
    const savedPalette = localStorage.getItem('kt-theme-palette');
    if (savedDark !== null) this.isDark = savedDark === 'true';
    if (savedPalette !== null) this.selectedPaletteIndex = parseInt(savedPalette, 10) || 0;
    this.applyTheme();
  }
  // ─────────────────────────────────────────────────────────────

  get uniqueProjectTags(): string[] {
    const tags = new Set<string>();
    this.projects.forEach(p => (p.tags || []).forEach(t => tags.add(t)));
    return ['Tous', ...Array.from(tags)];
  }

  get filteredProjects(): Project[] {
    if (this.selectedTag === 'Tous') return this.projects;
    return this.projects.filter(p => (p.tags || []).includes(this.selectedTag));
  }

  selectTag(tag: string): void {
    this.selectedTag = tag;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  settings: any = {
    display: {
      customCursor: true,
      bgGrid: true,
      animations: true,
      floatingCv: true
    },
    branding: {
      logoType: 'text',
      logoText: 'KT.',
      logoImage: null,
      favicon: null,
      siteIcon: null,
      fullName: 'Kadmiel TOGNON',
      footerRights: 'Tous droits réservés.',
      location: 'Le Mans, France'
    },
    hero: {},
    colors: {
      bg: '#070B14',
      primary: '#FF3B3B',
      secondary: '#7C3AED',
      text: '#FFFFFF'
    },
    typography: {
      titleFont: 'orbitron',
      bodyFont: 'syne'
    },
    seo: {
      title: '',
      description: '',
      keywords: '',
      ogTitle: '',
      ogImage: '',
      url: ''
    },
    social: {
      linkedin: '',
      github: '',
      twitter: '',
      instagram: '',
      whatsapp: ''
    }
  };

  // Contact Form
  contact = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;

  constructor(
    private el: ElementRef, 
    private renderer: Renderer2,
    private titleService: Title,
    private metaService: Meta,
    private projectService: ProjectService,
    private skillService: SkillService,
    private experienceService: ExperienceService,
    private aboutService: AboutService,
    private heroService: HeroService,
    private messageService: MessageService,
    private technicalLevelService: TechnicalLevelService,
    private analyticsService: AnalyticsService,
    private settingsService: SettingsService,
    private availabilityService: AvailabilityService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSavedTheme();
    this.loadData();
    this.loadSettings();
    this.analyticsService.track('pageview').subscribe();
  }

  private loadSettings(): void {
    this.settingsService.getAllSettings().subscribe({
      next: (data: any) => {
        // Merge with defaults to ensure all fields exist
        this.settings = {
          ...this.settings,
          ...data,
          display: { ...this.settings['display'], ...(data?.['display'] || {}) },
          branding: { ...this.settings['branding'], ...(data?.['branding'] || {}) },
          hero: { ...this.settings['hero'], ...(data?.['hero'] || {}) },
          colors: { ...this.settings['colors'], ...(data?.['colors'] || {}) },
          typography: { ...this.settings['typography'], ...(data?.['typography'] || {}) },
          seo: { ...this.settings['seo'], ...(data?.['seo'] || {}) },
          social: { ...this.settings['social'], ...(data?.['social'] || {}) }
        };
        this.applySettings();
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.applySettings();
      }
    });
  }

  private applySettings(): void {
    if (!this.settings) return;

    // Apply SEO
    const seo = this.settings['seo'];
    if (seo) {
      if (seo.title) this.titleService.setTitle(seo.title);
      if (seo.description) {
        this.metaService.updateTag({ name: 'description', content: seo.description });
        this.metaService.updateTag({ property: 'og:description', content: seo.description });
      }
      if (seo.keywords) this.metaService.updateTag({ name: 'keywords', content: seo.keywords });
      if (seo.ogTitle) this.metaService.updateTag({ property: 'og:title', content: seo.ogTitle });
      if (seo.url) this.metaService.updateTag({ property: 'og:url', content: seo.url });
      if (seo.ogImage) {
        const ogImage = this.resolveSettingsAssetUrl(seo.ogImage);
        this.metaService.updateTag({ property: 'og:image', content: ogImage });
        this.metaService.updateTag({ name: 'twitter:image', content: ogImage });
      }
    }

    // ── Synchroniser le mode dark/light depuis les paramètres admin ──────────
    // L'admin est "maître" : si display.darkMode est défini en DB, c'est lui
    // qui définit le mode par défaut du site. Le visiteur peut toujours
    // basculer localement, mais ce flag remet à zéro à chaque chargement.
    const display = this.settings['display'];
    if (display && display.darkMode !== undefined) {
      this.isDark = !!display.darkMode;
    }

    // ── Couleurs d'accent depuis l'admin ──────────────────────────────────────
    // On met à jour la palette courante avec les couleurs définies en back-office
    // (primary = --red, secondary = --violet). Les vars bg/text sont appliquées
    // ensuite par applyTheme() selon le mode dark/light.
    const colors = this.settings['colors'];
    if (colors) {
      const palette = this.palettes[this.selectedPaletteIndex];
      if (colors.primary) palette.primary = colors.primary;
      if (colors.secondary) palette.secondary = colors.secondary;
    }

    // ── Fonts ────────────────────────────────────────────────────────────────
    const typography = this.settings['typography'];
    if (typography) {
      const root = document.documentElement;
      if (typography.titleFont) {
        const font = typography.titleFont === 'orbitron' ? "'Orbitron', sans-serif" :
                    typography.titleFont === 'space' ? "'Space Mono', monospace" :
                    typography.titleFont === 'rajdhani' ? "'Rajdhani', sans-serif" :
                    "'Orbitron', sans-serif";
        root.style.setProperty('--font-title', font);
      }
      if (typography.bodyFont) {
        const font = typography.bodyFont === 'syne' ? "'Syne', sans-serif" :
                    typography.bodyFont === 'inter' ? "'Inter', sans-serif" :
                    typography.bodyFont === 'manrope' ? "'Manrope', sans-serif" :
                    "'Syne', sans-serif";
        root.style.setProperty('--font-body', font);
      }
      if (typography.lineHeight) {
        const lh = parseFloat(typography.lineHeight);
        if (!isNaN(lh)) root.style.setProperty('--line-height', String(lh));
      }
    }

    // ── Appliquer le thème complet (dark/light vars + accent colors) ──────────
    // Doit être appelé EN DERNIER pour que tout soit cohérent.
    this.applyTheme();
  }

  getBrandingAssetUrl(value: string | null | undefined): string {
    return this.resolveSettingsAssetUrl(value);
  }

  private resolveSettingsAssetUrl(value: string | null | undefined): string {
    if (!value) return '';
    if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('http')) return value;

    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  ngAfterViewInit(): void {
    this.initSmoothHashNavigation();
    this.initScrollProgress();
    this.initRevealOnScroll(); // On initialise l'observer immédiatement
    setTimeout(() => {
      this.initAnalyticsClickTracking();
    }, 1500); 
    this.initHamburgerMenu();
    this.initNavActiveLinkHighlight();
  }

  private loadData(): void {
    this.projectService.getProjects().subscribe({
      next: data => {
        this.projects = Array.isArray(data) ? data : [];
        this.isLoadingProjects = false;
        this.refreshReveals();
      },
      error: err => { this.isLoadingProjects = false; this.handleSectionLoadError('projects', err); },
    });
    this.skillService.getSkills().subscribe({
      next: data => {
        this.skills = Array.isArray(data) ? data : [];
        this.isLoadingSkills = false;
        this.refreshReveals();
      },
      error: err => { this.isLoadingSkills = false; this.handleSectionLoadError('skills', err); },
    });
    this.technicalLevelService.getTechnicalLevels().subscribe({
      next: data => {
        this.technicalLevels = Array.isArray(data) ? data : [];
        this.refreshReveals();
      },
      error: err => this.handleSectionLoadError('technical-levels', err),
    });
    this.experienceService.getExperiences().subscribe({
      next: data => {
        this.experiences = Array.isArray(data) ? data.map(exp => this.normalizeExperience(exp)) : [];
        this.refreshReveals();
      },
      error: err => this.handleSectionLoadError('experiences', err),
    });
    this.aboutService.getAbout().subscribe({
      next: data => {
        this.aboutData = data;
        this.refreshReveals();
      },
      error: err => this.handleSectionLoadError('about', err),
    });
    this.heroService.getHero().subscribe({
      next: data => {
        this.heroData = data;
        this.refreshReveals();
      },
      error: err => this.handleSectionLoadError('hero', err),
    });
    this.availabilityService.getAvailability().subscribe({
      next: data => {
        this.availability = data;
        this.refreshReveals();
      },
      error: err => this.handleSectionLoadError('availability', err),
    });
  }

  private normalizeExperience(exp: Experience): Experience {
    return {
      ...exp,
      description: Array.isArray(exp.description) ? exp.description : [],
      end_date: exp.end_date || null,
      current: Number(exp.current) || 0,
      digital_folder_url: exp.digital_folder_url || null,
      image: exp.image || null,
    };
  }

  private handleSectionLoadError(section: string, error: unknown): void {
    console.error(`Error loading ${section}:`, error);
    this.refreshReveals();
  }

  /* ─── UTILS ─── */
  getPhotoUrl(image: string | null | undefined): string {
    if (!image) return '';
    if (image.startsWith('data:') || image.startsWith('blob:') || image.startsWith('http')) return image;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    const normalized = image.startsWith('/') ? image : image.startsWith('uploads/') ? `/${image}` : `/uploads/${image}`;
    return `${baseUrl}${normalized}`;
  }

  getAboutPhotoUrl(image: string | null | undefined): string {
    return this.getPhotoUrl(image);
  }

  getImageUrl(image: string | null | undefined): string {
    if (!image) return this.placeholderProjectImage;
    return this.getPhotoUrl(image);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith(this.placeholderProjectImage)) return;
    img.src = this.placeholderProjectImage;
  }

  isDigitalFolderFormation(exp: Experience): boolean {
    const text = `${exp.title || ''} ${(exp.description || []).join(' ')}`.toLowerCase();
    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized.includes('services numeriques aux organisations');
  }

  onSubmitContact(): void {
    if (this.isSubmitting) return;
    this.analyticsService.track('contact_submit', { path: '/#contact' }).subscribe();
    
    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = false;

    this.messageService.sendMessage({
      name: this.contact.name,
      email: this.contact.email,
      subject: this.contact.subject,
      content: this.contact.message,
    }).subscribe({
      next: () => {
        this.submitSuccess = true;
        this.isSubmitting = false;
        this.contact = { name: '', email: '', subject: '', message: '' };
        this.analyticsService.track('contact_success', { path: '/#contact' }).subscribe();
      },
      error: () => {
        this.submitError = true;
        this.isSubmitting = false;
        this.analyticsService.track('contact_error', { path: '/#contact' }).subscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.unlisteners.forEach(fn => fn());
    this.observer?.disconnect();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.updateScrollProgress();
    this.updateNavActiveLink();
    this.trackScrollDepth();
    this.showBackToTop = window.scrollY > 400;
    if (this.showThemePanel) this.showThemePanel = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const panel = document.querySelector('.theme-panel');
    const trigger = document.querySelector('.theme-trigger');
    if (this.showThemePanel && panel && !panel.contains(e.target as Node) && !trigger?.contains(e.target as Node)) {
      this.showThemePanel = false;
    }
  }

  private trackScrollDepth(): void {
    const h = document.documentElement, 
          b = document.body,
          st = 'scrollTop',
          sh = 'scrollHeight';
    const percent = Math.floor((h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight) * 100);
    
    // On traque par paliers de 25%
    const thresholds = [25, 50, 75, 100];
    for (const threshold of thresholds) {
      if (percent >= threshold && this.maxScrollDepth < threshold) {
        this.maxScrollDepth = threshold;
        this.analyticsService.track('scroll_depth', { path: `/${threshold}%` }).subscribe();
      }
    }
  }

  private updateScrollProgress(): void {
    const prog = this.el.nativeElement.querySelector('#scrollProgress');
    if (prog) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      this.renderer.setStyle(prog, 'transform', `scaleX(${window.scrollY / h})`);
    }
  }

  private initScrollProgress(): void {
    this.updateScrollProgress();
  }

  private initRevealOnScroll(): void {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(e => { 
        if (e.isIntersecting) { 
          this.renderer.addClass(e.target, 'visible'); 
          const section = (e.target as HTMLElement).closest('section[id]') as HTMLElement | null;
          const id = section?.id;
          if (id && !this.trackedSections.has(id)) {
            this.trackedSections.add(id);
            this.analyticsService.track('section_view', { path: `/#${id}` }).subscribe();
          }
          this.observer?.unobserve(e.target); 
        } 
      });
    }, { threshold: 0.05 }); // Seuil réduit pour une meilleure réactivité

    this.refreshReveals();
  }

  private refreshReveals(): void {
    // Force la détection des changements pour être sûr que le DOM est à jour
    this.cdr.detectChanges();

    setTimeout(() => {
      const reveals = this.el.nativeElement.querySelectorAll('.reveal:not(.visible)');
      if (reveals.length === 0) return;

      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      reveals.forEach((r: HTMLElement) => {
        const rect = r.getBoundingClientRect();
        
        // Si l'élément est déjà visible à l'écran (même partiellement)
        // On utilise une marge de sécurité de 50px
        if (rect.top < windowHeight - 50 && rect.bottom > 50) {
          this.renderer.addClass(r, 'visible');
        } else {
          this.observer?.observe(r);
        }
      });
    }, 200);
  }

  private initAnalyticsClickTracking(): void {
    const clickListener = this.renderer.listen(this.el.nativeElement, 'click', (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null;
      if (!t) return;

      const el = t.closest('[data-analytics]') as HTMLElement | null;
      if (!el) return;

      const key = el.getAttribute('data-analytics') || 'click';
      const a = el.closest('a') as HTMLAnchorElement | null;
      const href = a?.getAttribute('href') || undefined;
      const path = href ? href : undefined;

      this.analyticsService.track(`click_${key}`, { path }).subscribe();
    });
    this.unlisteners.push(clickListener);
  }

  private initHamburgerMenu(): void {
    const burger = this.el.nativeElement.querySelector('#burger');
    const mobileMenu = this.el.nativeElement.querySelector('#mobileMenu');
    const mobileLinks = this.el.nativeElement.querySelectorAll('.mobile-link');
    
    if (!burger || !mobileMenu) return;

    const openMenu = () => {
      this.renderer.addClass(burger, 'open');
      this.renderer.addClass(mobileMenu, 'open');
      this.renderer.setAttribute(burger, 'aria-expanded', 'true');
      this.renderer.setStyle(document.body, 'overflow', 'hidden');
    };

    const closeMenu = () => {
      this.renderer.removeClass(burger, 'open');
      this.renderer.removeClass(mobileMenu, 'open');
      this.renderer.setAttribute(burger, 'aria-expanded', 'false');
      this.renderer.setStyle(document.body, 'overflow', '');
    };

    const burgerClickListener = this.renderer.listen(burger, 'click', () => burger.classList.contains('open') ? closeMenu() : openMenu());
    this.unlisteners.push(burgerClickListener);

    mobileLinks.forEach((l: HTMLElement) => {
      const linkClickListener = this.renderer.listen(l, 'click', closeMenu);
      this.unlisteners.push(linkClickListener);
    });

    const menuClickListener = this.renderer.listen(mobileMenu, 'click', (e: MouseEvent) => { if(e.target === mobileMenu) closeMenu(); });
    this.unlisteners.push(menuClickListener);

    const keydownListener = this.renderer.listen('document', 'keydown', (e: KeyboardEvent) => { if(e.key === 'Escape') closeMenu(); });
    this.unlisteners.push(keydownListener);
  }

  private updateNavActiveLink(): void {
    const sections = this.el.nativeElement.querySelectorAll('section[id]');
    const navLinks = this.el.nativeElement.querySelectorAll('.nav-links a');
    let current = '';
    sections.forEach((s: HTMLElement) => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
    navLinks.forEach((a: HTMLElement) => {
      const isActive = a.getAttribute('href') === '#' + current;
      if (isActive) {
        this.renderer.addClass(a, 'nav-active');
      } else {
        this.renderer.removeClass(a, 'nav-active');
      }
    });
  }

  private initNavActiveLinkHighlight(): void {
    this.updateNavActiveLink();
  }

  /**
   * Intercepte tous les clics sur les liens d'ancre (#section) dans ce composant
   * et fait un scrollIntoView fluide — sans passer par le router Angular,
   * ce qui évitait le rechargement de page.
   */
  private initSmoothHashNavigation(): void {
    const clickListener = this.renderer.listen(
      this.el.nativeElement,
      'click',
      (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a') as HTMLAnchorElement | null;
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (href && href.startsWith('#') && href.length > 1) {
          event.preventDefault();
          const sectionId = href.slice(1);
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    );
    this.unlisteners.push(clickListener);
  }

  incrementViewCount(id: number): void {
    this.projectService.incrementViewCount(id).subscribe({
      next: () => {
        const project = this.projects.find(p => p.id === id);
        if (project) {
          project.views = (project.views || 0) + 1;
        }
      },
      error: (err) => {
        console.error('Failed to increment view count', err);
      }
    });
  }
}
