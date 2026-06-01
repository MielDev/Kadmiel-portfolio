import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MessageService } from '../../services/message.service';
import { Observable, map } from 'rxjs';
import { SettingsService } from '../../services/settings.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.css'
})
export class AdminSidebarComponent implements OnInit {
  unreadCount$: Observable<number>;
  branding = {
    logoText: 'KT',
    logoSub: 'PORTFOLIO v2.2',
    logoImage: null as string | null,
    siteIcon: null as string | null,
  };

  constructor(
    private authService: AuthService, 
    private router: Router,
    private messageService: MessageService,
    private settingsService: SettingsService
  ) {
    this.unreadCount$ = this.messageService.messages$.pipe(
      map(messages => messages.filter(m => m.status === 'unread').length)
    );
  }

  ngOnInit(): void {
    // On charge les messages au démarrage pour avoir le compte
    this.messageService.getMessages().subscribe();
    this.loadBranding();
  }

  private loadBranding(): void {
    this.settingsService.getAllSettings().subscribe({
      next: settings => {
        this.branding = {
          ...this.branding,
          ...(settings?.['branding'] || {}),
        };
      },
      error: () => {}
    });
  }

  getBrandingAssetUrl(value: string | null | undefined): string {
    if (!value) return '';
    if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('http')) return value;

    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  getSidebarImage(): string | null {
    return this.branding.siteIcon || this.branding.logoImage;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
