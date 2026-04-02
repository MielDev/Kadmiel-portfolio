import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MessageService } from '../../services/message.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.css'
})
export class AdminSidebarComponent implements OnInit {
  unreadCount$: Observable<number>;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private messageService: MessageService
  ) {
    this.unreadCount$ = this.messageService.messages$.pipe(
      map(messages => messages.filter(m => m.status === 'unread').length)
    );
  }

  ngOnInit(): void {
    // On charge les messages au démarrage pour avoir le compte
    this.messageService.getMessages().subscribe();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
