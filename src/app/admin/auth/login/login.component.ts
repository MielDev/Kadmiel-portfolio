import { Component, AfterViewInit, ElementRef, ViewChild, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface Particle {
  size: number;
  left: string;
  duration: string;
  delay: string;
  background: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('cur') cur!: ElementRef<HTMLDivElement>;
  @ViewChild('curRing') curRing!: ElementRef<HTMLDivElement>;

  username = '';
  password = '';
  isSubmitting = false;
  loginSuccess = false;
  error: string | null = null;
  pwdVisible = false;
  remembered = false;

  // Cursor logic
  mx = 0; my = 0; rx = 0; ry = 0;
  isMobile = false;

  // Particles
  particles: Particle[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.matchMedia('(hover:none)').matches;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (!this.isMobile) {
        this.animRing();
      }
      this.generateParticles();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.isMobile) return;
    this.mx = e.clientX;
    this.my = e.clientY;
    if (this.cur) {
      this.cur.nativeElement.style.left = `${this.mx}px`;
      this.cur.nativeElement.style.top = `${this.my}px`;
    }
  }

  animRing(): void {
    this.rx += (this.mx - this.rx) * 0.12;
    this.ry += (this.my - this.ry) * 0.12;
    if (this.curRing) {
      this.curRing.nativeElement.style.left = `${this.rx}px`;
      this.curRing.nativeElement.style.top = `${this.ry}px`;
    }
    requestAnimationFrame(() => this.animRing());
  }

  onMouseEnterElement(): void {
    if (this.isMobile) return;
    if (this.curRing) {
      this.curRing.nativeElement.style.width = '44px';
      this.curRing.nativeElement.style.height = '44px';
      this.curRing.nativeElement.style.borderColor = 'var(--red)';
    }
  }

  onMouseLeaveElement(): void {
    if (this.isMobile) return;
    if (this.curRing) {
      this.curRing.nativeElement.style.width = '30px';
      this.curRing.nativeElement.style.height = '30px';
      this.curRing.nativeElement.style.borderColor = 'var(--violet)';
    }
  }

  generateParticles(): void {
    for (let i = 0; i < 18; i++) {
      const size = Math.random() * 3 + 1;
      this.particles.push({
        size: size,
        left: `${Math.random() * 100}%`,
        duration: `${Math.random() * 12 + 8}s`,
        delay: `${Math.random() * 10}s`,
        background: Math.random() > 0.5 ? 'var(--violet)' : 'var(--red)'
      });
    }
  }

  togglePwd(): void {
    this.pwdVisible = !this.pwdVisible;
  }

  toggleRemember(): void {
    this.remembered = !this.remembered;
  }

  onSubmit(): void {
    if (this.isSubmitting || this.loginSuccess) return;
    
    if (!this.username.trim() || !this.password) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loginSuccess = true;
        this.isSubmitting = false;
        // Redirection après succès avec délai pour l'animation
        setTimeout(() => {
          this.router.navigateByUrl('/admin/dashboard');
        }, 1200);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.error = "Identifiants incorrects. Réessayez.";
        console.error('Login error:', err);
      }
    });
  }
}
