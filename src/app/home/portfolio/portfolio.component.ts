import { 
  Component, 
  OnInit, 
  AfterViewInit, 
  OnDestroy, 
  ElementRef, 
  Renderer2, 
  HostListener, 
  Inject, 
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { SkillService } from '../../services/skill.service';
import { ExperienceService } from '../../services/experience.service';
import { TestimonialService } from '../../services/testimonial.service';
import { BlogService } from '../../services/blog.service';
import { AboutService, About } from '../../services/about.service';
import { HeroService } from '../../services/hero.service';
import { MessageService } from '../../services/message.service';
import { TechnicalLevelService } from '../../services/technical-level.service';
import { AvailabilityService, Availability } from '../../services/availability.service';
import { AnalyticsService } from '../../services/analytics.service';
import { Project } from '../../models/project.model';
import { Skill } from '../../models/skill.model';
import { Experience } from '../../models/experience.model';
import { Testimonial } from '../../models/testimonial.model';
import { Blog } from '../../models/blog.model';
import { TechnicalLevel } from '../../models/technical-level.model';
import { HeroData } from '../../models/hero.model';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent implements OnInit, AfterViewInit, OnDestroy {

  private unlisteners: (() => void)[] = [];
  private animTrailId?: number;
  private trackedSections = new Set<string>();
  private maxScrollDepth = 0;
  private observer?: IntersectionObserver;

  // Data
  projects: Project[] = [];
  skills: Skill[] = [];
  experiences: Experience[] = [];
  testimonials: Testimonial[] = [];
  blogs: Blog[] = [];
  technicalLevels: TechnicalLevel[] = [];
  aboutData: About | null = null;
  heroData: HeroData | null = null;
  availabilityData: Availability | null = null;

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
    private projectService: ProjectService,
    private skillService: SkillService,
    private experienceService: ExperienceService,
    private testimonialService: TestimonialService,
    private blogService: BlogService,
    private aboutService: AboutService,
    private heroService: HeroService,
    private messageService: MessageService,
    private technicalLevelService: TechnicalLevelService,
    private availabilityService: AvailabilityService,
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.analyticsService.track('pageview').subscribe();
  }

  ngAfterViewInit(): void {
    this.initCursor();
    this.initScrollProgress();
    this.initRevealOnScroll(); // On initialise l'observer immédiatement
    setTimeout(() => {
      this.initAnalyticsClickTracking();
    }, 1500); 
    this.initHamburgerMenu();
    this.initNavActiveLinkHighlight();
  }

  private loadData(): void {
    this.projectService.getProjects().subscribe(data => {
      this.projects = Array.isArray(data) ? data : [];
      this.refreshReveals();
    });
    this.skillService.getSkills().subscribe(data => {
      this.skills = Array.isArray(data) ? data : [];
      this.refreshReveals();
    });
    this.technicalLevelService.getTechnicalLevels().subscribe(data => {
      this.technicalLevels = Array.isArray(data) ? data : [];
      this.refreshReveals();
    });
    this.experienceService.getExperiences().subscribe(data => {
      this.experiences = Array.isArray(data) ? data : [];
      this.refreshReveals();
    });
    this.testimonialService.getTestimonials().subscribe(data => {
      this.testimonials = Array.isArray(data) ? data : [];
      this.refreshReveals();
    });
    this.blogService.getBlogs().subscribe(data => {
      this.blogs = Array.isArray(data) ? data : [];
      this.refreshReveals();
    });
    this.aboutService.getAbout().subscribe(data => {
      this.aboutData = data;
      this.refreshReveals();
    });
    this.heroService.getHero().subscribe(data => {
      this.heroData = data;
      this.refreshReveals();
    });
    this.availabilityService.getAvailability().subscribe(data => {
      this.availabilityData = data;
      this.refreshReveals();
    });
  }

  getPrimaryCtaHref(): string {
    const t = (this.availabilityData?.primary_cta_type || '').toLowerCase().trim();
    if (t === 'projects') return '#projects';
    if (t === 'contact') return '#contact';
    if (t === 'cv') return this.heroData?.cv || '#';
    return '#';
  }

  shouldDownload(url: string | null | undefined): boolean {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.endsWith('.pdf') || u.includes('/uploads/');
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
    if (this.animTrailId) cancelAnimationFrame(this.animTrailId);
    this.unlisteners.forEach(fn => fn());
    this.observer?.disconnect();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.updateScrollProgress();
    this.updateNavActiveLink();
    this.trackScrollDepth();
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

  private initCursor(): void {
    const cursor = this.el.nativeElement.querySelector('#cursor');
    const trail = this.el.nativeElement.querySelector('#cursorTrail');
    const isTouchDevice = () => window.matchMedia('(hover: none)').matches;

    if (isTouchDevice()) {
      if (cursor) this.renderer.setStyle(cursor, 'display', 'none');
      if (trail) this.renderer.setStyle(trail, 'display', 'none');
      this.renderer.setStyle(document.body, 'cursor', 'auto');
      this.el.nativeElement.querySelectorAll('*').forEach((el: HTMLElement) => this.renderer.setStyle(el, 'cursor', ''));
    } else {
      let mx = 0, my = 0, tx = 0, ty = 0;
      let isHover = false;

      const mouseMoveListener = this.renderer.listen('document', 'mousemove', (e: MouseEvent) => {
        mx = e.clientX; my = e.clientY;
        if (cursor) {
          this.renderer.setStyle(cursor, 'transform', `translate(${mx - 6}px, ${my - 6}px) scale(${isHover ? 1.8 : 1})`);
        }
      });
      this.unlisteners.push(mouseMoveListener);

      const animTrail = () => {
        tx += (mx - tx) * 0.12;
        ty += (my - ty) * 0.12;
        if (trail) {
          this.renderer.setStyle(trail, 'transform', `translate(${tx - 16}px, ${ty - 16}px)`);
        }
        this.animTrailId = requestAnimationFrame(animTrail);
      };
      animTrail();

      this.el.nativeElement.querySelectorAll('a, button, .btn, .skill-card, .project-card, .contact-item').forEach((el: HTMLElement) => {
        const mouseEnterListener = this.renderer.listen(el, 'mouseenter', () => {
          isHover = true;
          if (cursor) this.renderer.setStyle(cursor, 'transform', `translate(${mx - 6}px, ${my - 6}px) scale(1.8)`);
          if (trail) {
            this.renderer.setStyle(trail, 'width', '48px');
            this.renderer.setStyle(trail, 'height', '48px');
            this.renderer.setStyle(trail, 'borderColor', 'var(--accent-red)');
          }
        });
        const mouseLeaveListener = this.renderer.listen(el, 'mouseleave', () => {
          isHover = false;
          if (cursor) this.renderer.setStyle(cursor, 'transform', `translate(${mx - 6}px, ${my - 6}px) scale(1)`);
          if (trail) {
            this.renderer.setStyle(trail, 'width', '32px');
            this.renderer.setStyle(trail, 'height', '32px');
            this.renderer.setStyle(trail, 'borderColor', 'var(--accent-violet)');
          }
        });
        this.unlisteners.push(mouseEnterListener, mouseLeaveListener);
      });
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
      this.renderer.setStyle(a, 'color', a.getAttribute('href') === '#' + current ? 'var(--text-main)' : '');
    });
  }

  private initNavActiveLinkHighlight(): void {
    this.updateNavActiveLink();
  }
}
