import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExperienceService } from '../../services/experience.service';
import { Experience } from '../../models/experience.model';

@Component({
  selector: 'app-experiences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './experiences.component.html',
  styleUrl: './experiences.component.css',
})
export class ExperiencesComponent implements OnInit, AfterViewInit {
  experiences: Experience[] = [];
  filteredExperiences: Experience[] = [];
  groupedExperiences: {type: string, experiences: Experience[]}[] = [];
  
  // UI State
  curFilter: string = 'all';
  curView: string = 'grid';
  searchQuery: string = '';
  isLoading: boolean = true;

  // Stats
  counts = {
    total: 0,
    work: 0,
    stage: 0,
    edu: 0,
    freelance: 0
  };
  
  // Modal State
  isModalOpen: boolean = false;
  isDeleteModalOpen: boolean = false;
  editingExperience: Partial<Experience> | null = null;
  experienceToDelete: Experience | null = null;
  
  TYPE_CFG: any = {
    work:      {label:'💼 Emploi',     cls:'type-work',     color:'#FF3B3B', stripBg:'rgba(255,59,59,.06)'},
    stage:     {label:'📋 Stage',      cls:'type-stage',    color:'#FBBF24', stripBg:'rgba(251,191,36,.06)'},
    edu:       {label:'🎓 Formation',  cls:'type-edu',      color:'#7C3AED', stripBg:'rgba(124,58,237,.08)'},
    freelance: {label:'🚀 Freelance',  cls:'type-freelance',color:'#38BDF8', stripBg:'rgba(56,189,248,.06)'},
  };

  // Current Modal Form Data
  formData: any = {
    company: '',
    title: '',
    type: 'work',
    location: '',
    start_date: '',
    end_date: '',
    description_text: '',
    skills: '',
    icon: '🏢',
    color: '#7C3AED',
    current: 0
  };

  // Cursor coordinates
  mx = 0; my = 0; rx = 0; ry = 0;

  constructor(private experienceService: ExperienceService) {}

  ngOnInit(): void {
    this.loadExperiences();
  }

  ngAfterViewInit(): void {
    this.initCursorAnimation();
  }

  loadExperiences(): void {
    this.isLoading = true;
    this.experienceService.getExperiences().subscribe({
      next: (data) => {
        this.experiences = data.map(exp => ({
          ...exp,
          type: exp.type || this.inferType(exp),
          icon: exp.icon || this.inferIcon(exp),
          color: exp.color || this.inferColor(exp)
        }));
        this.updateStats();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading experiences', err);
        this.isLoading = false;
      }
    });
  }

  private updateStats(): void {
    this.counts.total = this.experiences.length;
    this.counts.work = this.experiences.filter(e => (e as any).type === 'work').length;
    this.counts.stage = this.experiences.filter(e => (e as any).type === 'stage').length;
    this.counts.edu = this.experiences.filter(e => (e as any).type === 'edu').length;
    this.counts.freelance = this.experiences.filter(e => (e as any).type === 'freelance').length;
  }

  applyFilters(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredExperiences = this.experiences.filter(e => {
      const matchFilter = this.curFilter === 'all' || (e as any).type === this.curFilter;
      const matchQuery = !q || 
        e.company.toLowerCase().includes(q) || 
        e.title.toLowerCase().includes(q) || 
        (e.description && e.description.some(d => d.toLowerCase().includes(q)));
      
      return matchFilter && matchQuery;
    });

    if (this.curFilter === 'all') {
      const order = ['work', 'stage', 'edu', 'freelance'];
      this.groupedExperiences = order.map(type => ({
        type,
        experiences: this.filteredExperiences.filter(e => (e as any).type === type)
      })).filter(g => g.experiences.length > 0);
    } else {
      this.groupedExperiences = [];
    }
  }

  // Cursor logic using HostListener
  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mx = e.clientX;
    this.my = e.clientY;
    const cur = document.getElementById('cur');
    if (cur) {
      cur.style.left = this.mx + 'px';
      cur.style.top = this.my + 'px';
    }

    // Event delegation for hover effect
    const target = e.target as HTMLElement;
    const isHoverable = target.closest('a, button, .exp-card, .filter-btn, .mini-stat');
    const ring = document.getElementById('curRing');
    
    if (ring) {
      if (isHoverable) {
        ring.style.width = '40px';
        ring.style.height = '40px';
        ring.style.borderColor = 'var(--red)';
      } else {
        ring.style.width = '28px';
        ring.style.height = '28px';
        ring.style.borderColor = 'var(--violet)';
      }
    }
  }

  private initCursorAnimation(): void {
    const ring = document.getElementById('curRing');
    if (!ring) return;

    const animateRing = () => {
      this.rx += (this.mx - this.rx) * 0.12;
      this.ry += (this.my - this.ry) * 0.12;
      ring.style.left = this.rx + 'px';
      ring.style.top = this.ry + 'px';
      requestAnimationFrame(animateRing);
    };
    animateRing();
  }

  // Use event delegation or simple hover states if needed, 
  // but for simplicity let's keep it to CSS as much as possible.
  // We can use [class.hovered] if strictly needed.

  // TrackBy for performance
  trackById(index: number, item: any): any {
    return item.id;
  }
  trackByType(index: number, item: any): any {
    return item.type;
  }

  private inferType(exp: Experience): string {
    const title = exp.title.toLowerCase();
    if (title.includes('stagiaire') || title.includes('stage')) return 'stage';
    if (title.includes('étudiant') || title.includes('licence') || title.includes('master')) return 'edu';
    if (title.includes('freelance') || title.includes('indépendant')) return 'freelance';
    return 'work';
  }

  private inferIcon(exp: Experience): string {
    const type = (exp as any).type || this.inferType(exp);
    if (type === 'edu') return '🎓';
    if (type === 'stage') return '📋';
    if (type === 'freelance') return '🚀';
    return '🏢';
  }

  private inferColor(exp: Experience): string {
    const type = (exp as any).type || this.inferType(exp);
    return this.TYPE_CFG[type]?.color || '#7C3AED';
  }

  private formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  formatDateForDisplay(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.toLowerCase() === 'en cours') return 'En cours';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ['Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  }

  setFilter(filter: string): void {
    this.curFilter = filter;
    this.applyFilters();
  }

  setView(view: string): void {
    this.curView = view;
  }

  openModal(experience?: Experience): void {
    if (experience) {
      this.editingExperience = experience;
      this.formData = {
        ...experience,
        start_date: this.formatDateForInput(experience.start_date),
        end_date: this.formatDateForInput(experience.end_date),
        description_text: (experience.description || []).join('\n'),
        current_bool: experience.current === 1
      };
    } else {
      this.editingExperience = null;
      this.formData = {
        company: '', title: '', type: 'work', location: '',
        start_date: '', end_date: '', description_text: '',
        skills: '',
        current: 0, current_bool: false
      };
    }
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  toggleCurrent(): void {
    this.formData.current_bool = !this.formData.current_bool;
    this.formData.current = this.formData.current_bool ? 1 : 0;
  }

  saveExperience(): void {
    if (!this.formData.company || !this.formData.title || !this.formData.start_date) {
      alert('L\'entreprise, le titre et la date de début sont requis.');
      return;
    }

    const experienceData: Experience = {
      ...this.formData,
      description: this.formData.description_text.split('\n').filter((t: string) => t.trim().length > 0),
      current: this.formData.current_bool ? 1 : 0,
      start_date: this.formData.start_date,
      end_date: (this.formData.current_bool || !this.formData.end_date) ? null : this.formData.end_date
    };

    if (this.editingExperience && this.editingExperience.id) {
      this.experienceService.updateExperience(this.editingExperience.id.toString(), experienceData).subscribe({
        next: () => {
          this.loadExperiences();
          this.closeModal();
        },
        error: (err) => console.error('Error updating experience', err)
      });
    } else {
      this.experienceService.createExperience(experienceData).subscribe({
        next: () => {
          this.loadExperiences();
          this.closeModal();
        },
        error: (err) => console.error('Error creating experience', err)
      });
    }
  }

  openDeleteModal(experience: Experience): void {
    this.experienceToDelete = experience;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.experienceToDelete = null;
  }

  confirmDelete(): void {
    if (this.experienceToDelete && this.experienceToDelete.id) {
      this.experienceService.deleteExperience(this.experienceToDelete.id.toString()).subscribe({
        next: () => {
          this.loadExperiences();
          this.closeDeleteModal();
        },
        error: (err) => console.error('Error deleting experience', err)
      });
    }
  }

  getDuration(start: string, end: string): string {
    if (!start) return '';
    const a = new Date(start);
    if (isNaN(a.getTime())) return '';
    
    const b = end ? new Date(end) : new Date();
    if (isNaN(b.getTime())) return '';

    const diff = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

    if(diff < 0) return '';
    if(diff < 1) return '< 1 mois';
    if(diff < 12) return diff + ' mois';
    const yrs = Math.floor(diff / 12);
    const rem = diff % 12;
    return yrs + ' an' + (yrs > 1 ? 's' : '') + (rem ? ` ${rem} m` : '');
  }

  getTypeLabel(type: string): string {
    return this.TYPE_CFG[type]?.label || type;
  }

  getTypeClass(type: string): string {
    return this.TYPE_CFG[type]?.cls || 'type-edu';
  }

  getTypeColor(type: string): string {
    return this.TYPE_CFG[type]?.color || '#7C3AED';
  }

  getStripBg(type: string): string {
    return this.TYPE_CFG[type]?.stripBg || 'rgba(124,58,237,.08)';
  }
}
