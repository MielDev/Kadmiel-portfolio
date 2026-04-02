import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AboutService, About } from '../../services/about.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-apropos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apropos.component.html',
  styleUrl: './apropos.component.css',
})
export class AproposComponent implements OnInit {
  activeTab: 'profil' | 'interets' = 'profil';
  about: About = {
    name: '',
    title: '',
    bio: '',
    location: '',
    email: '',
    phone: '',
    interests: [],
    social_links: {
      github: '',
      linkedin: '',
      twitter: '',
    }
  };

  constructor(
    private aboutService: AboutService
  ) {}

  ngOnInit(): void {
    this.loadAbout();
  }

  loadAbout(): void {
    this.aboutService.getAbout().subscribe({
      next: (data) => {
        if (data) {
          this.about = data;
          if (!this.about.social_links) {
            this.about.social_links = { github: '', linkedin: '', twitter: '' };
          }
          if (!this.about.interests) {
            this.about.interests = [];
          }
        }
      },
      error: (err) => console.error('Error loading about data', err)
    });
  }

  switchTab(tab: 'profil' | 'interets'): void {
    this.activeTab = tab;
  }

  saveAbout(): void {
    // Ensure data is clean before sending
    const aboutToSave: any = {
      name: this.about.name || '',
      title: this.about.title || '',
      bio: this.about.bio || '',
      photo: this.about.photo || null,
      resume_url: this.about.resume_url || null,
      location: this.about.location || '',
      nationality: this.about.nationality || '',
      email: this.about.email || '',
      phone: this.about.phone || '',
      interests: Array.isArray(this.about.interests) ? this.about.interests : [],
      social_links: typeof this.about.social_links === 'object' ? this.about.social_links : {}
    };

    // If it has an id, include it (though backend uses 'existing' check)
    if (this.about.id) aboutToSave.id = this.about.id;

    this.aboutService.updateAbout(aboutToSave).subscribe({
      next: (data) => {
        // Only update if data is returned, otherwise reload to be sure
        if (data) {
          this.about = data;
        } else {
          this.loadAbout();
        }
        alert('Profil mis à jour avec succès !');
      },
      error: (err) => {
        console.error('Error updating about data', err);
        alert('Erreur lors de la mise à jour : ' + (err.error?.message || err.message));
      }
    });
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.aboutService.uploadPhoto(file).subscribe({
        next: (photoUrl) => {
          this.about.photo = photoUrl;
          alert('Photo mise à jour !');
        },
        error: (err) => console.error('Error uploading photo', err)
      });
    }
  }

  removePhoto(): void {
    this.about.photo = undefined;
    alert('Photo retirée (n\'oubliez pas de sauvegarder)');
  }

  getPhotoUrl(photo: string | undefined): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    const baseUrl = environment.apiUrl.replace('/api', '');
    if (photo.includes('uploads/')) {
      return `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
    }
    return `${baseUrl}/uploads/${photo}`;
  }

  // Interests methods
  toggleInterest(interest: string): void {
    const index = this.about.interests.indexOf(interest);
    if (index > -1) {
      this.about.interests.splice(index, 1);
    } else {
      this.about.interests.push(interest);
    }
  }

  addCustomInterest(input: HTMLInputElement): void {
    const val = input.value.trim();
    if (val && !this.about.interests.includes(val)) {
      this.about.interests.push(val);
      input.value = '';
    }
  }

  // Bio tag helpers
  bioTags = [
    { label: 'Gradient', snippet: '<b class="text-gradient">Texte</b>' },
    { label: 'Violet', snippet: '<span class="text-violet">Texte</span>' },
    { label: 'Rouge', snippet: '<span class="text-red">Texte</span>' },
    { label: 'Surligné', snippet: '<span class="highlight">Texte</span>' },
    { label: 'Gras', snippet: '<b>Texte</b>' },
    { label: 'Saut de ligne', snippet: '<br>' },
  ];

  insertTag(snippet: string, textarea: HTMLTextAreaElement): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = this.about.bio || '';
    
    this.about.bio = text.substring(0, start) + snippet + text.substring(end);
    
    // Defer focus and cursor placement
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + snippet.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }
}
