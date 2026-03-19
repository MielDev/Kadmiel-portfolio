import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  username = '';
  password = '';
  isSubmitting = false;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.error = null;

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/admin/dashboard');
      },
      error: () => {
        this.isSubmitting = false;
        this.error = "Identifiants invalides.";
      }
    });
  }
}
