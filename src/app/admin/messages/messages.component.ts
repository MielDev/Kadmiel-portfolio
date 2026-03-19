import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from '../../services/message.service';
import { Message } from '../../models/message.model';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css',
})
export class MessagesComponent implements OnInit {
  messages: Message[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.isLoading = true;
    this.error = null;

    this.messageService.getMessages().subscribe({
      next: (messages) => {
        this.messages = messages;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.error = "Impossible de charger les messages (auth requise).";
      }
    });
  }

  markRead(message: Message): void {
    if (!message.id) return;
    this.messageService.updateStatus(message.id, 'read').subscribe({
      next: () => this.refresh(),
      error: () => this.refresh(),
    });
  }

  delete(message: Message): void {
    if (!message.id) return;
    this.messageService.deleteMessage(String(message.id)).subscribe({
      next: () => this.refresh(),
      error: () => this.refresh(),
    });
  }
}
