import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Message } from '../models/message.model';
import { ApiResponse } from '../models/api-response.model';
import { Observable, map, BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/messages`;
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {}

  getMessages(): Observable<Message[]> {
    return this.http.get<ApiResponse<Message[]>>(this.apiUrl).pipe(
      map(response => response.success ? response.data : []),
      tap(messages => this.messagesSubject.next(messages))
    );
  }

  getMessage(id: string): Observable<Message> {
    return this.http.get<ApiResponse<Message>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  sendMessage(message: Partial<Message>): Observable<Message> {
    return this.http.post<ApiResponse<Message>>(this.apiUrl, message).pipe(
      map(response => response.data)
    );
  }

  deleteMessage(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => {
        const currentMessages = this.messagesSubject.value.filter(m => String(m.id) !== id);
        this.messagesSubject.next(currentMessages);
        return undefined;
      })
    );
  }

  updateStatus(id: number, status: string): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${id}`, { status }).pipe(
      map(() => {
        const currentMessages = this.messagesSubject.value.map(m => 
          m.id === id ? { ...m, status } : m
        );
        this.messagesSubject.next(currentMessages);
        return undefined;
      })
    );
  }
}
