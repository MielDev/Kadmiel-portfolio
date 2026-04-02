import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import { Message } from '../../models/message.model';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css',
})
export class MessagesComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  filteredMessages: Message[] = [];
  isLoading = false;
  error: string | null = null;

  // UI State
  curFilter = 'all';
  searchQuery = '';
  selectedId: number | null = null;
  selectedMessage: Message | null = null;
  checkedMessages = new Set<number>();
  replyText = '';
  
  // Modals & Toasts
  showDeleteModal = false;
  showViewModal = false; // Nouveau: modal de visualisation
  deleteTarget: Message | null = null;
  viewTarget: Message | null = null; // Nouveau: message à visualiser
  toastMessage: string | null = null;
  toastType: 'info' | 'success' | 'error' = 'info';
  private toastTimeout: any;

  // Constants
  private readonly AV_COLORS = ['#7C3AED', '#FF3B3B', '#38BDF8', '#22C55E', '#FBBF24', '#FB923C', '#F472B6', '#A78BFA', '#34D399', '#60A5FA'];

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.refresh();
  }

  ngOnDestroy(): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  refresh(): void {
    this.isLoading = true;
    this.error = null;

    this.messageService.getMessages().subscribe({
      next: (messages) => {
        this.messages = messages;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.error = "Impossible de charger les messages.";
        this.showToast(this.error, 'error');
      }
    });
  }

  // Filter Logic
  setFilter(filter: string): void {
    this.curFilter = filter;
    this.applyFilter();
  }

  onSearch(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredMessages = this.messages.filter(m => {
      const matchFilter = this.curFilter === 'all' ||
        (this.curFilter === 'unread' && m.status === 'unread') ||
        (this.curFilter === 'read' && m.status === 'read') ||
        (this.curFilter === 'starred' && m.status === 'starred') ||
        (this.curFilter === 'archived' && m.status === 'archived');
      
      const matchQuery = !query || 
        m.name.toLowerCase().includes(query) || 
        m.email.toLowerCase().includes(query) ||
        m.subject.toLowerCase().includes(query) || 
        m.content.toLowerCase().includes(query);

      return matchFilter && matchQuery;
    });
  }

  // Stats
  getUnreadCount(): number {
    return this.messages.filter(m => m.status === 'unread').length;
  }
  getStarredCount(): number {
    return this.messages.filter(m => m.status === 'starred').length;
  }
  getArchivedCount(): number {
    return this.messages.filter(m => m.status === 'archived').length;
  }
  getProcessedCount(): number {
    return this.messages.filter(m => m.status === 'read').length;
  }

  // Actions
  openMsg(message: Message): void {
    this.selectedId = message.id;
    this.selectedMessage = message;
    
    if (message.status === 'unread') {
      this.updateStatus(message, 'read');
    }
  }

  // Nouveau: Visualisation en popup
  viewMessage(message: Message): void {
    this.viewTarget = message;
    this.showViewModal = true;
    if (message.status === 'unread') {
      this.updateStatus(message, 'read');
    }
  }

  closeView(): void {
    this.showViewModal = false;
    this.viewTarget = null;
  }

  toggleRead(message: Message): void {
    const newStatus = message.status === 'unread' ? 'read' : 'unread';
    this.updateStatus(message, newStatus);
  }

  toggleStar(message: Message): void {
    const newStatus = message.status === 'starred' ? 'read' : 'starred';
    this.updateStatus(message, newStatus);
  }

  toggleArchive(message: Message): void {
    const newStatus = message.status === 'archived' ? 'read' : 'archived';
    this.updateStatus(message, newStatus);
  }

  private updateStatus(message: Message, status: string): void {
    this.messageService.updateStatus(message.id, status).subscribe({
      next: () => {
        message.status = status;
        this.applyFilter();
        this.showToast(status === 'read' ? '✓ Marqué comme lu.' : 
                       status === 'unread' ? '↩ Marqué non lu.' :
                       status === 'starred' ? '⭐ Ajouté aux favoris.' : 
                       status === 'archived' ? '📦 Message archivé.' : 'Statut mis à jour.', 'info');
      },
      error: () => this.showToast("Erreur lors de la mise à jour", 'error')
    });
  }

  // Delete
  openDelete(message: Message): void {
    this.deleteTarget = message;
    this.showDeleteModal = true;
  }

  closeDelete(): void {
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    const id = String(this.deleteTarget.id);
    this.messageService.deleteMessage(id).subscribe({
      next: () => {
        if (this.selectedId === this.deleteTarget?.id) {
          this.selectedId = null;
          this.selectedMessage = null;
        }
        this.messages = this.messages.filter(m => m.id !== Number(id));
        this.applyFilter();
        this.closeDelete();
        this.showToast('🗑 Message supprimé.', 'error');
      },
      error: () => this.showToast("Erreur lors de la suppression", 'error')
    });
  }

  // Bulk
  toggleCheck(id: number): void {
    if (this.checkedMessages.has(id)) this.checkedMessages.delete(id);
    else this.checkedMessages.add(id);
  }

  clearSelection(): void {
    this.checkedMessages.clear();
  }

  bulkMarkRead(): void {
    const promises = Array.from(this.checkedMessages).map(id => 
      this.messageService.updateStatus(id, 'read').toPromise()
    );
    Promise.all(promises).then(() => {
      this.messages.forEach(m => {
        if (this.checkedMessages.has(m.id)) m.status = 'read';
      });
      this.clearSelection();
      this.applyFilter();
      this.showToast('✓ Messages marqués comme lus.', 'success');
    });
  }

  bulkDelete(): void {
    const promises = Array.from(this.checkedMessages).map(id => 
      this.messageService.deleteMessage(String(id)).toPromise()
    );
    Promise.all(promises).then(() => {
      this.messages = this.messages.filter(m => !this.checkedMessages.has(m.id));
      this.clearSelection();
      this.applyFilter();
      this.showToast(`🗑 Messages supprimés.`, 'error');
    });
  }

  // Reply
  updateReplyChar(): void {
    if (this.replyText.length > 500) {
      this.replyText = this.replyText.substring(0, 500);
    }
  }

  sendReply(): void {
    if (!this.replyText.trim()) {
      this.showToast('Rédigez une réponse avant d\'envoyer.', 'error');
      return;
    }
    // Simulation d'envoi
    this.showToast(`📨 Réponse envoyée à ${this.selectedMessage?.name || this.viewTarget?.name} !`, 'success');
    this.replyText = '';
  }

  replyByEmail(): void {
    const msg = this.selectedMessage || this.viewTarget;
    if (!msg) return;
    window.open(`mailto:${msg.email}?subject=Re: ${msg.subject}`, '_blank');
  }

  // Helpers
  avColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) {
      h = (h * 31 + name.charCodeAt(i)) % this.AV_COLORS.length;
    }
    return this.AV_COLORS[h];
  }

  initials(name: string): string {
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  showToast(msg: string, type: 'info' | 'success' | 'error' = 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage = null, 3200);
  }
}
