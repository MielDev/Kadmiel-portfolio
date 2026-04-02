import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestimonialService } from '../../services/testimonial.service';
import { Testimonial } from '../../models/testimonial.model';
import { RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-testimonial-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <!-- Custom cursor -->
    <div class="cur" #cur [style.display]="isMobile ? 'none' : 'block'"></div>
    <div class="cur-ring" #curRing [style.display]="isMobile ? 'none' : 'block'"></div>

    <div class="testimonial-page">
      <div class="form-container">
        <header class="form-header">
          <div class="logo">KT</div>
          <h1>Laissez un témoignage</h1>
          <p>Votre avis est précieux pour moi. Merci de partager votre expérience de collaboration.</p>
        </header>

        <div *ngIf="loadingToken" class="loading-card">
          <div class="spinner"></div>
          <p>Vérification du lien...</p>
        </div>

        <div *ngIf="tokenInvalid && !loadingToken" class="error-card">
          <div class="error-icon">🚫</div>
          <h2>Lien invalide ou expiré</h2>
          <p>Ce lien unique a déjà été utilisé ou n'est plus valide. Merci de me contacter pour en obtenir un nouveau ou utilisez le lien public.</p>
          <button routerLink="/" class="back-btn">Retour au site</button>
        </div>

        <div *ngIf="!submitted && !tokenInvalid && !loadingToken" class="form-card">
          <form (ngSubmit)="submitForm()" #tForm="ngForm">
            <div class="photo-upload">
              <div class="avatar-preview" (click)="photoInput.click()">
                <img *ngIf="photoPreview" [src]="photoPreview" alt="Preview">
                <span *ngIf="!photoPreview">{{ getInitials() }}</span>
                <div class="upload-overlay">📷</div>
              </div>
              <input #photoInput type="file" (change)="onFileSelected($event)" style="display: none" accept="image/*">
              <p class="hint">Cliquez pour ajouter une photo (optionnel)</p>
            </div>

            <div class="form-group">
              <label>Nom complet *</label>
              <input type="text" name="name" [(ngModel)]="formData.name" required placeholder="Votre nom">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Entreprise / Organisation</label>
                <input type="text" name="company" [(ngModel)]="formData.company" placeholder="Ex: EDS Télécom">
              </div>
              <div class="form-group">
                <label>Votre rôle</label>
                <input type="text" name="role" [(ngModel)]="formData.role" placeholder="Ex: CEO, Manager...">
              </div>
            </div>

            <div class="form-group">
              <label>Votre message *</label>
              <textarea name="content" [(ngModel)]="formData.content" required placeholder="Que pensez-vous de notre collaboration ?" rows="5"></textarea>
            </div>

            <button type="submit" [disabled]="!tForm.form.valid || loading" class="submit-btn">
              <span *ngIf="!loading">Envoyer mon témoignage</span>
              <span *ngIf="loading">Envoi en cours...</span>
            </button>
          </form>
        </div>

        <div *ngIf="submitted" class="success-card">
          <div class="success-icon">✨</div>
          <h2>Merci beaucoup !</h2>
          <p>Votre témoignage a été envoyé avec succès. Il sera visible sur le portfolio après validation.</p>
          <button routerLink="/" class="back-btn">Retour au site</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #7C3AED;
      --accent: #FF3B3B;
      --bg: #070B14;
      --card: #0F172A;
      --text: #E5E7EB;
      --muted: #9CA3AF;
      --border: rgba(255, 255, 255, 0.06);
      cursor: none !important;
    }

    /* CUSTOM CURSOR */
    .cur {
      position: fixed; pointer-events: none; z-index: 9999;
      top: 0; left: 0;
      width: 10px; height: 10px;
      background: var(--accent);
      border-radius: 50%;
      transform: translate(-50%,-50%);
      transition: transform 0.08s;
      mix-blend-mode: screen;
    }
    .cur-ring {
      position: fixed; pointer-events: none; z-index: 9998;
      top: 0; left: 0;
      width: 30px; height: 30px;
      border: 1.5px solid var(--primary);
      border-radius: 50%;
      transform: translate(-50%,-50%);
      transition: transform 0.15s ease, width 0.2s, height 0.2s, border-color 0.2s;
    }

    .testimonial-page {
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
      font-family: 'Inter', sans-serif;
    }

    .form-container {
      width: 100%;
      max-width: 500px;
    }

    .form-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .logo {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      font-weight: 900;
      font-size: 1.2rem;
      color: white;
      box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);
    }

    h1 { font-size: 1.8rem; margin-bottom: 0.8rem; font-weight: 700; }
    p { color: var(--muted); line-height: 1.6; }

    .form-card, .success-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .photo-upload {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2rem;
    }

    .avatar-preview {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.03);
      border: 2px dashed var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: none;
      position: relative;
      overflow: hidden;
      margin-bottom: 0.8rem;
      transition: all 0.3s;
    }

    .avatar-preview:hover {
      border-color: var(--primary);
      background: rgba(124, 58, 237, 0.05);
    }

    .avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-preview span { font-size: 1.5rem; font-weight: 700; color: var(--primary); }

    .upload-overlay {
      position: absolute;
      bottom: 0; right: 0; left: 0;
      background: rgba(124, 58, 237, 0.8);
      color: white;
      padding: 0.2rem;
      font-size: 0.8rem;
      text-align: center;
      opacity: 0;
      transition: 0.3s;
    }

    .avatar-preview:hover .upload-overlay { opacity: 1; }

    .hint { font-size: 0.75rem; color: var(--muted); }

    .form-group { margin-bottom: 1.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    label { display: block; font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

    input, textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.8rem 1rem;
      color: white;
      font-size: 0.95rem;
      transition: all 0.3s;
      cursor: none;
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: var(--primary);
      background: rgba(124, 58, 237, 0.03);
      box-shadow: 0 0 15px rgba(124, 58, 237, 0.1);
    }

    .submit-btn {
      width: 100%;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      color: white;
      border: none;
      padding: 1rem;
      border-radius: 12px;
      font-weight: 700;
      cursor: none;
      transition: 0.3s;
      margin-top: 1rem;
    }

    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(124, 58, 237, 0.4); }

    .loading-card, .error-card, .success-card { text-align: center; padding: 4rem 2rem; background: var(--card); border: 1px solid var(--border); border-radius: 20px; }
    .error-icon { font-size: 4rem; margin-bottom: 1.5rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(124, 58, 237, 0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .success-card { text-align: center; padding: 4rem 2rem; }
    .success-icon { font-size: 4rem; margin-bottom: 1.5rem; }
    .back-btn {
      margin-top: 2rem;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.8rem 2rem;
      border-radius: 10px;
      cursor: none;
      transition: 0.3s;
    }
    .back-btn:hover { background: rgba(255, 255, 255, 0.05); }

    @media (max-width: 480px) {
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class TestimonialFormComponent implements OnInit, AfterViewInit {
  formData: any = {
    name: '',
    company: '',
    role: '',
    content: '',
    status: 'pending',
    photo: null
  };
  
  photoPreview: string | null = null;
  loading = false;
  submitted = false;
  
  token: string | null = null;
  loadingToken = false;
  tokenInvalid = false;

  // Cursor logic
  @ViewChild('cur') cur!: ElementRef;
  @ViewChild('curRing') curRing!: ElementRef;
  isMobile = false;
  private mouseX = 0;
  private mouseY = 0;
  private ringX = 0;
  private ringY = 0;

  constructor(
    private testimonialService: TestimonialService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.isMobile = window.innerWidth <= 768;
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (this.token) {
      this.verifyToken();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isMobile) {
      this.animateRing();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isMobile) return;
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    
    if (this.cur) {
      this.cur.nativeElement.style.left = `${this.mouseX}px`;
      this.cur.nativeElement.style.top = `${this.mouseY}px`;
    }
  }

  private animateRing(): void {
    const followSpeed = 0.12;
    this.ringX += (this.mouseX - this.ringX) * followSpeed;
    this.ringY += (this.mouseY - this.ringY) * followSpeed;

    if (this.curRing) {
      this.curRing.nativeElement.style.left = `${this.ringX}px`;
      this.curRing.nativeElement.style.top = `${this.ringY}px`;
    }

    requestAnimationFrame(() => this.animateRing());
  }

  @HostListener('mouseover', ['$event'])
  onMouseOver(event: any): void {
    if (this.isMobile || !this.curRing) return;
    const target = event.target as HTMLElement;
    const interactiveSelectors = ['a', 'button', 'input', 'textarea', '.avatar-preview'];
    const isInteractive = interactiveSelectors.some(selector => target.closest(selector));

    if (isInteractive) {
      this.curRing.nativeElement.style.width = '44px';
      this.curRing.nativeElement.style.height = '44px';
      this.curRing.nativeElement.style.borderColor = 'var(--accent)';
    } else {
      this.curRing.nativeElement.style.width = '30px';
      this.curRing.nativeElement.style.height = '30px';
      this.curRing.nativeElement.style.borderColor = 'var(--primary)';
    }
  }

  verifyToken() {
    this.loadingToken = true;
    this.testimonialService.verifyToken(this.token!).subscribe({
      next: (valid) => {
        this.loadingToken = false;
        this.tokenInvalid = !valid;
      },
      error: () => {
        this.loadingToken = false;
        this.tokenInvalid = true;
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => this.photoPreview = e.target.result;
      reader.readAsDataURL(file);

      // Upload
      this.testimonialService.uploadPhoto(file).subscribe({
        next: (path) => this.formData.photo = path,
        error: (err) => console.error('Upload error', err)
      });
    }
  }

  getInitials() {
    if (!this.formData.name) return '?';
    return this.formData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
  }

  submitForm() {
    this.loading = true;
    
    // Clean data before sending
    const testimonialData = {
      ...this.formData,
      photo: this.formData.photo || null,
      company: this.formData.company || '',
      role: this.formData.role || '',
      status: 'pending' // Force pending for public submissions
    };

    const request = this.token 
      ? this.testimonialService.createWithToken(this.token, testimonialData)
      : this.testimonialService.createTestimonial(testimonialData);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
      },
      error: (err) => {
        this.loading = false;
        console.error('Submit error', err);
        alert("Une erreur est survenue lors de l'envoi : " + (err.error?.message || err.message));
      }
    });
  }
}
