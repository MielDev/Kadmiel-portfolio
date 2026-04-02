import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TechnicalLevelService } from '../../services/technical-level.service';
import { TechnicalLevel } from '../../models/technical-level.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-niveaux-tech',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './niveaux-tech.html',
  styleUrl: './niveaux-tech.css',
})
export class NiveauxTech implements OnInit, OnDestroy {
  // Config
  readonly ICONS = [
    'fa-brands fa-angular', 'fa-brands fa-react', 'fa-brands fa-node-js', 'fa-brands fa-laravel', 
    'fa-brands fa-php', 'fa-brands fa-python', 'fa-brands fa-js', 'fa-brands fa-vuejs', 
    'fa-solid fa-database', 'fa-brands fa-docker', 'fa-solid fa-cloud', 'fa-solid fa-shield-halved', 
    'fa-brands fa-figma', 'fa-solid fa-palette', 'fa-solid fa-mobile-screen', 'fa-brands fa-android',
    'fa-brands fa-apple', 'fa-solid fa-server', 'fa-solid fa-code', 'fa-solid fa-terminal',
    'fa-solid fa-bolt', 'fa-solid fa-gear', 'fa-solid fa-microchip', 'fa-solid fa-network-wired'
  ];
  
  readonly CATEGORIES = ['hard', 'soft'];

  // State
  skills: TechnicalLevel[] = [];
  filteredSkills: TechnicalLevel[] = [];
  groupedSkills: { [key: string]: (TechnicalLevel & { dots: boolean[], levelInfo: any })[] } = {};
  currentCat: string = 'all';
  searchQuery: string = '';
  sortBy: string = 'order-asc';
  
  // UI State
  isModalOpen = false;
  isDeleteModalOpen = false;
  editingId: number | null = null;
  deleteId: number | null = null;
  deleteSkillName: string = '';
  
  // Form State
  formSkill: Partial<TechnicalLevel> = {
    title: '',
    type: 'hard',
    description: '',
    percent: 75,
    icon: 'fa-solid fa-bolt',
    sort_order: 0
  };

  // Stats
  stats = {
    total: 0,
    avgLevel: 0,
    experts: 0,
    categories: 0
  };

  // Clock
  currentTime: string = '';
  private clockInterval: any;
  private subscriptions: Subscription = new Subscription();

  constructor(private techService: TechnicalLevelService) {}

  ngOnInit() {
    this.loadSkills();
    this.startClock();
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.subscriptions.unsubscribe();
  }

  loadSkills() {
    this.subscriptions.add(
      this.techService.getTechnicalLevels().subscribe(data => {
        this.skills = data;
        this.applyFilters();
      })
    );
  }

  applyFilters() {
    let list = [...this.skills];

    // Category filter
    if (this.currentCat !== 'all') {
      list = list.filter(s => s.type === this.currentCat);
    }

    // Search filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s => 
        s.title.toLowerCase().includes(q) || 
        (s.description && s.description.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (this.sortBy === 'percent-desc') list.sort((a, b) => (b.percent || 0) - (a.percent || 0));
    else if (this.sortBy === 'percent-asc') list.sort((a, b) => (a.percent || 0) - (b.percent || 0));
    else if (this.sortBy === 'order-asc') list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    else list.sort((a, b) => a.title.localeCompare(b.title));

    this.filteredSkills = list;
    this.updateStats();
    this.updateGroupedSkills();
  }

  updateStats() {
    const total = this.skills.length;
    const avgLevel = total ? Math.round(this.skills.reduce((a, s) => a + (s.percent || 0), 0) / total) : 0;
    const experts = this.skills.filter(s => (s.percent || 0) >= 90).length;
    const cats = new Set(this.skills.map(s => s.type)).size;

    this.stats = { total, avgLevel, experts, categories: cats };
  }

  updateGroupedSkills() {
    const groups: { [key: string]: any[] } = {};
    this.filteredSkills.forEach(s => {
      if (!groups[s.type]) groups[s.type] = [];
      groups[s.type].push({
        ...s,
        dots: this.calculateDots(s.percent || 0),
        levelInfo: this.calculateLevelLabel(s.percent || 0)
      });
    });
    this.groupedSkills = groups;
  }

  setCat(cat: string) {
    this.currentCat = cat;
    this.applyFilters();
  }

  // Modal actions
  openModal(skill?: TechnicalLevel) {
    if (skill) {
      this.editingId = skill.id;
      this.formSkill = { ...skill };
    } else {
      this.editingId = null;
      this.formSkill = {
        title: '',
        type: 'hard',
        description: '',
        percent: 75,
        icon: 'fa-solid fa-bolt',
        sort_order: 0
      };
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveSkill() {
    if (!this.formSkill.title) return;

    if (this.editingId) {
      this.techService.updateTechnicalLevel(this.editingId, this.formSkill).subscribe(() => {
        this.loadSkills();
        this.closeModal();
      });
    } else {
      this.techService.createTechnicalLevel(this.formSkill).subscribe(() => {
        this.loadSkills();
        this.closeModal();
      });
    }
  }

  openDeleteModal(skill: TechnicalLevel) {
    this.deleteId = skill.id;
    this.deleteSkillName = skill.title;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
  }

  confirmDelete() {
    if (this.deleteId) {
      this.techService.deleteTechnicalLevel(this.deleteId).subscribe(() => {
        this.loadSkills();
        this.closeDeleteModal();
      });
    }
  }

  // Helpers (Pre-calculated for items to avoid flickering)
  calculateLevelLabel(n: number) {
    if (n >= 90) return { text: 'Expert', color: '#22C55E' };
    if (n >= 75) return { text: 'Avancé', color: '#38BDF8' };
    if (n >= 60) return { text: 'Intermédiaire', color: '#FBBF24' };
    return { text: 'Débutant', color: '#FB923C' };
  }

  calculateDots(level: number) {
    return Array(10).fill(0).map((_, i) => i < Math.round(level / 10));
  }

  // UI Helpers (Called less frequently or for static values)
  catEmoji(cat: string) {
    const map: any = { 'hard': 'fa-solid fa-bolt', 'soft': 'fa-solid fa-brain' };
    return map[cat] || 'fa-solid fa-star';
  }

  catBadgeStyle(cat: string) {
    const map: any = {
      'hard': 'background:rgba(255,59,59,.1);color:#FF3B3B;',
      'soft': 'background:rgba(167,139,250,.1);color:#A78BFA;',
    };
    return map[cat] || 'background:rgba(124,58,237,.1);color:#7C3AED;';
  }

  private startClock() {
    const tick = () => {
      const n = new Date();
      this.currentTime = n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick();
    this.clockInterval = setInterval(tick, 1000);
  }
}
