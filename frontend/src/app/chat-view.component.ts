import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ChatMessage } from './api.types';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="shell chat-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Conversation</p>
          <h1>Persistent chat history</h1>
        </div>
        <button class="secondary" (click)="logout()">Logout</button>
      </header>

      <section class="history">
        <article *ngFor="let item of messages" [class.assistant]="item.role === 'assistant'" [class.user]="item.role === 'user'">
          <span>{{ item.role }}</span>
          <p>{{ item.content }}</p>
        </article>
      </section>

      <footer class="composer">
        <input [(ngModel)]="message" placeholder="Ask something..." (keydown.enter)="send()" />
        <button (click)="send()">Send</button>
      </footer>
    </main>
  `,
  styles: [
    `
      .shell { min-height: 100vh; padding: 1.5rem; }
      .chat-shell { max-width: 1000px; margin: 0 auto; display: grid; gap: 1rem; }
      .topbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
      .history { display: grid; gap: 0.9rem; align-content: start; min-height: 55vh; padding: 1rem; border-radius: 24px; border: 1px solid var(--border); background: rgba(255, 250, 243, 0.8); backdrop-filter: blur(10px); }
      article { max-width: 75%; padding: 1rem 1.1rem; border-radius: 18px; background: white; border: 1px solid var(--border); }
      article.user { margin-left: auto; background: #e6fffb; }
      article.assistant { background: #fff; }
      span { display: block; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted); margin-bottom: 0.35rem; }
      .composer { display: flex; gap: 0.75rem; }
      input { flex: 1; border: 1px solid var(--border); border-radius: 999px; padding: 0.95rem 1rem; background: var(--panel); }
      button { border: 0; border-radius: 999px; padding: 0.95rem 1.2rem; background: var(--accent); color: white; cursor: pointer; }
      button.secondary { background: transparent; color: var(--accent-strong); border: 1px solid var(--border); }
    `,
  ],
})
export class ChatViewComponent implements OnInit {
  message = '';
  messages: ChatMessage[] = [];

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigateByUrl('/');
      return;
    }

    this.auth.history(token).subscribe({
      next: (messages) => (this.messages = messages),
      error: () => this.router.navigateByUrl('/'),
    });
  }

  send(): void {
    const token = localStorage.getItem('token');
    if (!token || !this.message.trim()) {
      return;
    }

    const outgoing = this.message.trim();
    this.message = '';
    this.auth.sendMessage(token, outgoing).subscribe({
      next: () => this.reloadHistory(token),
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigateByUrl('/');
  }

  private reloadHistory(token: string): void {
    this.auth.history(token).subscribe({ next: (messages) => (this.messages = messages) });
  }
}
