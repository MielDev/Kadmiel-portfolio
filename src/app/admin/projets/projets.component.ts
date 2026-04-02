import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import Swal from 'sweetalert2';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets.component.html',
  styleUrl: './projets.component.css',
})
export class ProjetsComponent implements OnInit {
  /* ─── DATA ─── */
  projects: Project[] = [];

  editingId: number | null = null;
  deleteId: number | null = null;
  currentFilter = 'all';
  currentView = 'grid';
  selectedEmoji = '🚀';
  searchQuery = '';
  loading = false;

  // Stats
  stats = {
    total: 0,
    live: 0,
    pause: 0,
    archive: 0,
    views: 0,
  };

  // Modal Fields
  fTitle = '';
  fCat = 'Application Web';
  fDescription = '';
  fTags = '';
  fStatus: 'live' | 'pause' | 'archive' = 'live';
  fYear = '';
  fGithubUrl = '';
  fDemoUrl = '';
  fImageFile: File | null = null;
  fImageUrl = '';

  // UI States
  isModalOpen = false;
  isDeleteModalOpen = false;
  toast = {
    show: false,
    msg: '',
    type: 'info' as 'info' | 'success' | 'error',
  };

  constructor(
    private projectService: ProjectService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  /* ─── DATA LOADING ─── */
  loadProjects() {
    this.loading = true;
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.updateStats();
        this.loading = false;
      },
      error: (err) => {
        this.showToast('Erreur lors du chargement des projets', 'error');
        this.loading = false;
      }
    });
  }

  /* ─── RENDER / STATS ─── */
  get filteredProjects() {
    return this.projects.filter((p) => {
      const matchFilter = this.currentFilter === 'all' || p.status === this.currentFilter;
      const matchSearch =
        !this.searchQuery ||
        p.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(this.searchQuery.toLowerCase()));
      return matchFilter && matchSearch;
    });
  }

  updateStats() {
    this.stats.total = this.projects.length;
    this.stats.live = this.projects.filter((p) => p.status === 'live' || !p.status).length;
    this.stats.pause = this.projects.filter((p) => p.status === 'pause').length;
    this.stats.archive = this.projects.filter((p) => p.status === 'archive').length;
    this.stats.views = this.projects.reduce((a, p) => a + (p.views || 0), 0);
  }

  /* ─── FILTER / SEARCH / VIEW ─── */
  setFilter(val: string) {
    this.currentFilter = val;
  }

  setView(v: string) {
    this.currentView = v;
  }

  /* ─── MODAL ─── */
  openModal() {
    this.editingId = null;
    this.fTitle = '';
    this.fCat = 'Application Web';
    this.fDescription = '';
    this.fTags = '';
    this.fYear = '';
    this.fGithubUrl = '';
    this.fDemoUrl = '';
    this.fImageFile = null;
    this.fImageUrl = '';
    this.fStatus = 'live';
    this.isModalOpen = true;
  }

  openEditModal(id: number) {
    const p = this.projects.find((x) => x.id === id);
    if (!p) return;
    this.editingId = id;
    this.fTitle = p.title;
    this.fCat = p.cat || 'Application Web';
    this.fDescription = p.description;
    this.fTags = p.tags.join(', ');
    this.fYear = p.year || '';
    this.fGithubUrl = p.github_url || '';
    this.fDemoUrl = p.demo_url || '';
    this.fImageFile = null;
    this.fImageUrl = this.getImageUrl(p.image);
    this.fStatus = p.status || 'live';
    this.isModalOpen = true;
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fImageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async triggerImagePicker() {
    const { value: file } = await Swal.fire({
      title: 'Sélectionner une image',
      input: 'file',
      inputAttributes: {
        'accept': 'image/*',
        'aria-label': 'Télécharger votre image de projet'
      },
      showCancelButton: true,
      confirmButtonText: 'Sélectionner',
      cancelButtonText: 'Annuler',
      background: '#111827',
      color: '#fff',
      confirmButtonColor: '#7C3AED',
    });

    if (file) {
      this.fImageFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveProject() {
    if (!this.fTitle.trim()) {
      this.showToast('Le titre du projet est requis.', 'error');
      return;
    }
    if (!this.fDescription.trim()) {
      this.showToast('La description est requise.', 'error');
      return;
    }
    if (!this.fImageFile && !this.fImageUrl) {
      this.showToast("L'image est requise.", 'error');
      return;
    }

    const tagsArray = this.fTags.split(',').map(t => t.trim()).filter(t => t !== '');

    const formData = new FormData();
    formData.append('title', this.fTitle);
    formData.append('description', this.fDescription);
    formData.append('cat', this.fCat);
    formData.append('tags', JSON.stringify(tagsArray));
    formData.append('status', this.fStatus);
    formData.append('year', this.fYear || new Date().getFullYear().toString());
    formData.append('github_url', this.fGithubUrl || '');
    formData.append('demo_url', this.fDemoUrl || '');
    if (this.fImageFile) {
      formData.append('image', this.fImageFile);
    }

    if (this.editingId) {
      this.projectService.updateProject(this.editingId, formData).subscribe({
        next: () => {
          this.showToast('✅ Projet mis à jour avec succès.', 'success');
          this.loadProjects();
          this.closeModal();
        },
        error: () => this.showToast('Erreur lors de la mise à jour', 'error')
      });
    } else {
      this.projectService.createProject(formData).subscribe({
        next: () => {
          this.showToast('🚀 Nouveau projet créé !', 'success');
          this.loadProjects();
          this.closeModal();
        },
        error: () => this.showToast('Erreur lors de la création', 'error')
      });
    }
  }

  /* ─── DELETE ─── */
  openDeleteModal(id: number) {
    this.deleteId = id;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
  }

  get projectToDeleteName() {
    return this.projects.find((p) => p.id === this.deleteId)?.title || '';
  }

  confirmDelete() {
    if (this.deleteId) {
      this.projectService.deleteProject(this.deleteId).subscribe({
        next: () => {
          this.showToast('🗑 Projet supprimé.', 'error');
          this.loadProjects();
          this.closeDeleteModal();
        },
        error: () => this.showToast('Erreur lors de la suppression', 'error')
      });
    }
  }

  /* ─── UTILS ─── */
  getImageUrl(image: string): string {
    if (!image) return 'assets/placeholder-project.jpg';
    if (image.startsWith('http')) return image;
    const baseUrl = environment.apiUrl.replace('/api', '');
    // Si l'image contient déjà "uploads/", on ne le rajoute pas
    if (image.includes('uploads/')) {
      return `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
    }
    return `${baseUrl}/uploads/${image}`;
  }

  showToast(msg: string, type: 'info' | 'success' | 'error' = 'info') {
    this.toast.msg = msg;
    this.toast.type = type;
    this.toast.show = true;
    setTimeout(() => (this.toast.show = false), 3200);
  }

  incrementViewCount(id: number) {
    this.projectService.incrementViewCount(id).subscribe({
      next: () => {
        const project = this.projects.find(p => p.id === id);
        if (project) {
          project.views = (project.views || 0) + 1;
          this.updateStats();
        }
      },
      error: (err) => {
        console.error('Failed to increment view count', err);
      }
    });
  }
}
