import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkillService } from '../../services/skill.service';
import { Skill } from '../../models/skill.model';

@Component({
  selector: 'app-competences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './competences.component.html',
  styleUrl: './competences.component.css',
})
export class CompetencesComponent implements OnInit {
  skills: Skill[] = [];
  filteredSkills: Skill[] = [];
  searchTerm: string = '';
  currentFilter: string = 'all';
  
  // Modal state
  showModal: boolean = false;
  showDeleteModal: boolean = false;
  isEditing: boolean = false;
  editingId: number | null = null;
  deleteId: number | null = null;
  deleteName: string = '';

  // Form data
  formData: Skill = {
    id: 0,
    title: '',
    description: '',
    icon: '⚡',
    technologies: [],
    category: 'Frontend'
  };

  newTag: string = '';

  readonly ICONS = [
    { name: 'Éclair', class: 'fas fa-bolt' },
    { name: 'Clé à molette', class: 'fas fa-wrench' },
    { name: 'Base de données', class: 'fas fa-database' },
    { name: 'Baleine', class: 'fas fa-whale' },
    { name: 'Cadenas', class: 'fas fa-lock' },
    { name: 'Mobile', class: 'fas fa-mobile-alt' },
    { name: 'Palette', class: 'fas fa-palette' },
    { name: 'Tâches', class: 'fas fa-tasks' },
    { name: 'Globe', class: 'fas fa-globe' },
    { name: 'React', class: 'fab fa-react' },
    { name: 'Fusée', class: 'fas fa-rocket' },
    { name: 'Ordinateur', class: 'fas fa-laptop-code' },
    { name: 'Graphique', class: 'fas fa-chart-line' },
    { name: 'Bouclier', class: 'fas fa-shield-alt' },
    { name: 'Engrenages', class: 'fas fa-cogs' },
    { name: 'Nuage', class: 'fas fa-cloud' },
    { name: 'Lien', class: 'fas fa-link' },
    { name: 'Fiole', class: 'fas fa-flask' },
    { name: 'Ampoule', class: 'fas fa-lightbulb' },
    { name: 'Poignée de main', class: 'fas fa-handshake' }
  ];
  readonly CAT_COLOR: { [key: string]: string } = {
    'Frontend': '#FF3B3B',
    'Backend': '#22C55E',
    'Base de données': '#FBBF24',
    'DevOps': '#38BDF8',
    'Mobile': '#60A5FA',
    'Sécurité': '#F472B6',
    'Design': '#FB923C',
    'Gestion': '#A78BFA',
    'Analytics': '#34D399',
  };

  constructor(private skillService: SkillService) {}

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    this.skillService.getSkills().subscribe({
      next: (skills) => {
        this.skills = skills;
        this.applyFilters();
      },
      error: (err) => console.error('Error loading skills', err)
    });
  }

  applyFilters(): void {
    const q = this.searchTerm.toLowerCase();
    this.filteredSkills = this.skills.filter(s => {
      const category = s.category || s.title;
      const matchFilter = this.currentFilter === 'all' || category === this.currentFilter;
      const matchQuery = !q ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.technologies && s.technologies.some(t => t.toLowerCase().includes(q)));
      return matchFilter && matchQuery;
    });
  }

  setFilter(filter: string): void {
    this.currentFilter = filter;
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }



  getCategoryColor(category: string | undefined): string {
    return category ? (this.CAT_COLOR[category] || '#7C3AED') : '#7C3AED';
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.formData = {
      id: 0,
      title: '',
      description: '',
      icon: '⚡',
      technologies: [],
      category: 'Frontend'
    };
    this.showModal = true;
  }

  openEditModal(skill: Skill): void {
    this.isEditing = true;
    this.editingId = skill.id;
    this.formData = { ...skill, technologies: [...skill.technologies] };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onTagInputKeyDown(event: KeyboardEvent): void {
    if (event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  addTag(): void {
    const tag = this.newTag.trim();
    if (tag && !this.formData.technologies.includes(tag)) {
      this.formData.technologies.push(tag);
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.formData.technologies = this.formData.technologies.filter(t => t !== tag);
  }

  saveSkill(): void {
    if (!this.formData.title) return;

    if (this.isEditing && this.editingId) {
      this.skillService.updateSkill(this.editingId.toString(), this.formData).subscribe({
        next: () => {
          this.loadSkills();
          this.closeModal();
        }
      });
    } else {
      this.skillService.createSkill(this.formData).subscribe({
        next: () => {
          this.loadSkills();
          this.closeModal();
        }
      });
    }
  }

  openDeleteModal(skill: Skill): void {
    this.deleteId = skill.id;
    this.deleteName = skill.title;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (this.deleteId) {
      this.skillService.deleteSkill(this.deleteId.toString()).subscribe({
        next: () => {
          this.loadSkills();
          this.closeDeleteModal();
        }
      });
    }
  }

  selectIcon(icon: string): void {
    this.formData.icon = icon;
  }
}
