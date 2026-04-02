import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestimonialService } from '../../services/testimonial.service';
import { Testimonial } from '../../models/testimonial.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-temoignages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './temoignages.component.html',
  styleUrl: './temoignages.component.css',
})
export class TemoignagesComponent implements OnInit {
  testimonials: Testimonial[] = [];
  loading: boolean = false;
  
  // Modal states
  showAddModal: boolean = false;
  showDeleteModal: boolean = false;
  
  // Form models
  editingTestimonial: Testimonial | null = null;
  testimonialForm: Testimonial = {
    name: '',
    role: '',
    company: '',
    content: '',
    status: 'pending'
  };

  deleteTestimonialId: number | null = null;
  deleteTestimonialName: string = '';

  constructor(private testimonialService: TestimonialService) {}

  ngOnInit(): void {
    this.loadTestimonials();
  }

  loadTestimonials(): void {
    this.loading = true;
    this.testimonialService.getAllTestimonials().subscribe({
      next: (data) => {
        this.testimonials = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading testimonials', err);
        // Fallback to public testimonials if /all fails (e.g. route not implemented yet)
        this.testimonialService.getTestimonials().subscribe({
          next: (publicData) => {
            this.testimonials = publicData;
            this.loading = false;
          },
          error: () => this.loading = false
        });
      }
    });
  }

  openAddModal(testimonial?: Testimonial): void {
    if (testimonial) {
      this.editingTestimonial = testimonial;
      this.testimonialForm = { ...testimonial };
    } else {
      this.editingTestimonial = null;
      this.testimonialForm = {
        name: '',
        role: '',
        company: '',
        content: '',
        status: 'pending'
      };
    }
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.editingTestimonial = null;
  }

  saveTestimonial(): void {
    const testimonialData = {
      ...this.testimonialForm,
      photo: this.testimonialForm.photo || null,
      company: this.testimonialForm.company || '',
      role: this.testimonialForm.role || '',
      status: this.testimonialForm.status || 'pending'
    };

    if (this.editingTestimonial && this.editingTestimonial.id) {
      this.testimonialService.updateTestimonial(this.editingTestimonial.id.toString(), testimonialData).subscribe({
        next: () => {
          this.loadTestimonials();
          this.closeAddModal();
        },
        error: (err) => {
          console.error('Error updating testimonial', err);
          alert("Erreur lors de la modification : " + (err.error?.message || err.message));
        }
      });
    } else {
      this.testimonialService.createTestimonial(testimonialData).subscribe({
        next: () => {
          this.loadTestimonials();
          this.closeAddModal();
        },
        error: (err) => {
          console.error('Error creating testimonial', err);
          alert("Erreur lors de la création : " + (err.error?.message || err.message));
        }
      });
    }
  }

  openDeleteModal(id: number | undefined, name: string): void {
    if (id === undefined) return;
    this.deleteTestimonialId = id;
    this.deleteTestimonialName = name;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTestimonialId = null;
  }

  confirmDelete(): void {
    if (this.deleteTestimonialId) {
      this.testimonialService.deleteTestimonial(this.deleteTestimonialId.toString()).subscribe({
        next: () => {
          this.loadTestimonials();
          this.closeDeleteModal();
        },
        error: (err) => console.error('Error deleting testimonial', err)
      });
    }
  }

  toggleStatus(testimonial: Testimonial): void {
    if (!testimonial.id) return;
    const newStatus: 'published' | 'pending' = testimonial.status === 'published' ? 'pending' : 'published';
    const updated: Testimonial = { ...testimonial, status: newStatus };
    
    this.testimonialService.updateTestimonial(testimonial.id.toString(), updated).subscribe({
      next: () => this.loadTestimonials(),
      error: (err) => console.error('Error toggling status', err)
    });
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  copyPublicLink(): void {
    const baseUrl = window.location.origin;
    const publicLink = `${baseUrl}/testimonial/new`;
    
    navigator.clipboard.writeText(publicLink).then(() => {
      alert('Lien de récolte public copié !');
    }).catch(err => {
      console.error('Erreur lors de la copie du lien', err);
    });
  }

  generateUniqueLink(): void {
    this.testimonialService.generateUniqueLink().subscribe({
      next: (data) => {
        const baseUrl = window.location.origin;
        const uniqueLink = `${baseUrl}/testimonial/new?token=${data.token}`;
        
        navigator.clipboard.writeText(uniqueLink).then(() => {
          alert('Lien UNIQUE (usage unique) généré et copié !');
        });
      },
      error: (err) => {
        console.error('Erreur lors de la génération du lien unique', err);
        alert('Impossible de générer un lien unique. Vérifiez votre backend.');
      }
    });
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.testimonialService.uploadPhoto(file).subscribe({
        next: (photoPath) => {
          this.testimonialForm.photo = photoPath;
        },
        error: (err) => console.error('Error uploading photo', err)
      });
    }
  }

  removePhoto(): void {
    this.testimonialForm.photo = null;
  }

  getPhotoUrl(photo: string | null | undefined): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    const baseUrl = environment.apiUrl.replace('/api', '');
    if (photo.includes('uploads/')) {
      return `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
    }
    return `${baseUrl}/uploads/${photo}`;
  }
}
