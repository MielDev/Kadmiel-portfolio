import { Component, OnInit, OnDestroy, HostListener, ElementRef, Renderer2 } from '@angular/core';
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
export class PortfolioComponent implements OnInit, OnDestroy {

  private unlisteners: (() => void)[] = [];
  private animTrailId?: number;

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
    private availabilityService: AvailabilityService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.initCursor();
    this.initScrollProgress();
    this.initRevealOnScroll();
    this.initHamburgerMenu();
    this.initNavActiveLinkHighlight();
  }

  private loadData(): void {
    this.projectService.getProjects().subscribe(data => this.projects = Array.isArray(data) ? data : []);
    this.skillService.getSkills().subscribe(data => {
      this.skills = Array.isArray(data) ? data : [];
    });
    this.technicalLevelService.getTechnicalLevels().subscribe(data => {
      this.technicalLevels = Array.isArray(data) ? data : [];
    });
    this.experienceService.getExperiences().subscribe(data => this.experiences = Array.isArray(data) ? data : []);
    this.testimonialService.getTestimonials().subscribe(data => this.testimonials = Array.isArray(data) ? data : []);
    this.blogService.getBlogs().subscribe(data => this.blogs = Array.isArray(data) ? data : []);
    this.aboutService.getAbout().subscribe(data => this.aboutData = data);
    this.heroService.getHero().subscribe(data => this.heroData = data);
    this.availabilityService.getAvailability().subscribe(data => this.availabilityData = data);
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
      },
      error: () => {
        this.submitError = true;
        this.isSubmitting = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.unlisteners.forEach(unlistener => unlistener());
    if (this.animTrailId) {
      cancelAnimationFrame(this.animTrailId);
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.updateScrollProgress();
    this.updateNavActiveLink();
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
    const reveals = this.el.nativeElement.querySelectorAll('.reveal');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { 
        if (e.isIntersecting) { 
          this.renderer.addClass(e.target, 'visible'); 
          io.unobserve(e.target); 
        } 
      });
    }, { threshold: 0.12 });
    reveals.forEach((r: HTMLElement) => io.observe(r));
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
