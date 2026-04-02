import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-navbar.html',
  styleUrl: './admin-navbar.css'
})
export class AdminNavbarComponent implements OnInit, OnDestroy {
  currentTime: string = '';
  currentPage: string = 'Accueil';
  unreadCount$: Observable<number>;
  private timer: any;

  constructor(
    private router: Router,
    private messageService: MessageService
  ) {
    this.unreadCount$ = this.messageService.messages$.pipe(
      map(messages => messages.filter(m => m.status === 'unread').length)
    );

    this.updateTime();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateBreadcrumb();
    });
  }

  ngOnInit(): void {
    this.timer = setInterval(() => this.updateTime(), 1000);
    this.updateBreadcrumb();
    
    // On s'assure que les messages sont chargés pour le badge
    this.messageService.getMessages().subscribe();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private updateBreadcrumb(): void {
    const url = this.router.url;
    if (url.includes('dashboard')) this.currentPage = 'Accueil';
    else if (url.includes('projets')) this.currentPage = 'Projets';
    else if (url.includes('messages')) this.currentPage = 'Messages';
    else if (url.includes('blog')) this.currentPage = 'Blog';
    else if (url.includes('competences')) this.currentPage = 'Compétences';
    else if (url.includes('experiences')) this.currentPage = 'Expériences';
    else if (url.includes('apropos')) this.currentPage = 'Profil';
    else if (url.includes('temoignages')) this.currentPage = 'Témoignages';
    else if (url.includes('parametres')) this.currentPage = 'Paramètres';
    else if (url.includes('analytics')) this.currentPage = 'Analytics';
  }
}
