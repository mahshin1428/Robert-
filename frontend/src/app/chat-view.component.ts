import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatMessage } from './api.types';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-icon">R</div>
          <span>Robert</span>
        </div>
        <div class="flex-spacer"></div>
        <button class="logout-btn" (click)="logout()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </aside>

      <!-- Main area -->
      <div class="main">
        <header class="topbar">
          <div class="topbar-left">
            <span class="topbar-title">Chat</span>
          </div>
          <div class="status-badge" [class.thinking]="streaming">
            <span class="status-dot"></span>
            {{ streaming ? 'Thinking…' : 'Ready' }}
          </div>
        </header>

        <!-- Messages -->
        <div class="messages" #scrollEl>
          <div class="empty" *ngIf="messages.length === 0 && !historyLoading">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p>No messages yet.<br>Say something below to get started.</p>
          </div>

          <div class="spinner-wrap" *ngIf="historyLoading">
            <div class="spinner"></div>
          </div>

          <div
            *ngFor="let msg of messages"
            class="msg-row"
            [class.user-row]="msg.role === 'user'"
          >
            <div class="avatar" [class.user-av]="msg.role === 'user'">
              {{ msg.role === 'user' ? 'U' : 'R' }}
            </div>
            <div class="bubble" [class.user-bubble]="msg.role === 'user'">
              <div class="bubble-text" [innerHTML]="formatContent(msg.content)"></div>
              <span class="ts">{{ formatTime(msg.created_at) }}</span>
            </div>
          </div>

          <div class="typing-row" *ngIf="streaming && lastMsgEmpty()">
            <div class="avatar">R</div>
            <div class="bubble typing-bubble">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          </div>
        </div>

        <!-- Composer -->
        <div class="composer">
          <textarea
            #inputEl
            [(ngModel)]="draft"
            placeholder="Message Robert…"
            [disabled]="streaming"
            (keydown)="onKey($event)"
            rows="1"
          ></textarea>
          <button class="send-btn" (click)="send()" [disabled]="streaming || !draft.trim()" aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .layout {
      display: flex;
      height: 100vh;
      background: #0f0f14;
    }

    /* ── Sidebar ────────────────────────────────── */
    .sidebar {
      width: 210px;
      flex-shrink: 0;
      background: #12121a;
      border-right: 1px solid rgba(255,255,255,0.055);
      display: flex;
      flex-direction: column;
      padding: 1.25rem 1rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      color: #ededf5;
      font-weight: 650;
      font-size: 0.975rem;
      padding: 0.2rem 0.35rem;
    }

    .brand-icon {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: linear-gradient(135deg, #7c6af5 0%, #a78bfa 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.85rem;
      color: #fff;
      flex-shrink: 0;
    }

    .flex-spacer { flex: 1; }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      width: 100%;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.075);
      border-radius: 9px;
      padding: 0.55rem 0.8rem;
      color: #8f8fa8;
      font-size: 0.845rem;
      cursor: pointer;
      transition: background 0.14s, color 0.14s, border-color 0.14s;
    }

    .logout-btn:hover {
      background: rgba(255,255,255,0.04);
      color: #ededf5;
      border-color: rgba(255,255,255,0.13);
    }

    /* ── Main ───────────────────────────────────── */
    .main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1.5rem;
      background: #12121a;
      border-bottom: 1px solid rgba(255,255,255,0.055);
    }

    .topbar-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #ededf5;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.38rem;
      font-size: 0.775rem;
      color: #8f8fa8;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #3fb950;
      transition: background 0.2s;
    }

    .status-badge.thinking .status-dot {
      background: #7c6af5;
      animation: pulse 1.1s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.25; }
    }

    /* ── Messages ───────────────────────────────── */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem 1.5rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .messages::-webkit-scrollbar { width: 5px; }
    .messages::-webkit-scrollbar-track { background: transparent; }
    .messages::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.08);
      border-radius: 99px;
    }

    .empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #8f8fa8;
      text-align: center;
      gap: 0.75rem;
      padding: 4rem 1rem;
    }

    .empty-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: #1e1e2e;
      border: 1px solid rgba(255,255,255,0.07);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8f8fa8;
    }

    .empty p {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.7;
    }

    .spinner-wrap {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .spinner {
      width: 26px;
      height: 26px;
      border: 2px solid rgba(255,255,255,0.06);
      border-top-color: #7c6af5;
      border-radius: 50%;
      animation: spin 0.65s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .msg-row {
      display: flex;
      align-items: flex-start;
      gap: 0.7rem;
      max-width: 76%;
    }

    .user-row {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 700;
      background: #1e1e2e;
      color: #7c6af5;
      border: 1px solid rgba(124,106,245,0.18);
    }

    .user-av {
      background: rgba(124,106,245,0.12);
      color: #a89ff7;
    }

    .bubble {
      background: #1e1e2e;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      padding: 0.7rem 0.95rem;
    }

    .user-bubble {
      background: rgba(124,106,245,0.11);
      border-color: rgba(124,106,245,0.22);
    }

    .bubble-text {
      color: #dde0ee;
      font-size: 0.9225rem;
      line-height: 1.65;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .ts {
      display: block;
      font-size: 0.685rem;
      color: #6b6b85;
      margin-top: 0.3rem;
    }

    /* typing indicator */
    .typing-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }

    .typing-bubble {
      display: flex;
      gap: 0.28rem;
      align-items: center;
      padding: 0.75rem 1rem;
    }

    .dot {
      width: 6px;
      height: 6px;
      background: #8f8fa8;
      border-radius: 50%;
      animation: bounce 1.15s ease-in-out infinite;
    }

    .dot:nth-child(2) { animation-delay: 0.14s; }
    .dot:nth-child(3) { animation-delay: 0.28s; }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); opacity: 0.35; }
      50%       { transform: translateY(-5px); opacity: 1; }
    }

    /* ── Composer ───────────────────────────────── */
    .composer {
      flex-shrink: 0;
      display: flex;
      align-items: flex-end;
      gap: 0.65rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(255,255,255,0.055);
      background: #12121a;
    }

    textarea {
      flex: 1;
      background: #1e1e2e;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 0.72rem 1rem;
      color: #ededf5;
      font-size: 0.9225rem;
      resize: none;
      line-height: 1.55;
      min-height: 44px;
      max-height: 160px;
      overflow-y: auto;
      transition: border-color 0.15s;
    }

    textarea:focus {
      outline: none;
      border-color: rgba(124,106,245,0.45);
    }

    textarea::placeholder { color: rgba(143,143,168,0.55); }
    textarea:disabled     { opacity: 0.45; cursor: not-allowed; }

    .send-btn {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: 11px;
      background: #7c6af5;
      border: none;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.14s, opacity 0.14s;
    }

    .send-btn:hover:not(:disabled) { background: #6d5bd0; }
    .send-btn:disabled { opacity: 0.38; cursor: not-allowed; }

    /* ── Responsive ─────────────────────────────── */
    @media (max-width: 600px) {
      .sidebar { display: none; }
      .msg-row { max-width: 92%; }
    }
  `],
})
export class ChatViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollEl') private scrollEl!: ElementRef<HTMLDivElement>;

  draft = '';
  messages: ChatMessage[] = [];
  streaming = false;
  historyLoading = true;
  private shouldScroll = false;
  private streamSub?: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  private loadHistory(): void {
    const token = localStorage.getItem('token');
    if (!token) { this.router.navigateByUrl('/'); return; }

    this.auth.history(token).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.historyLoading = false;
        this.shouldScroll = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 401) {
          this.attemptRefreshAndRetry(() => this.loadHistory(), () => {
            this.historyLoading = false;
            this.cdr.detectChanges();
          });
        } else {
          this.historyLoading = false;
          this.cdr.detectChanges();
          this.router.navigateByUrl('/');
        }
      },
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.streamSub?.unsubscribe();
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  send(): void {
    const token = localStorage.getItem('token');
    if (!token || !this.draft.trim() || this.streaming) return;

    const text = this.draft.trim();
    this.draft = '';
    this.streaming = true;
    this.shouldScroll = true;

    this.messages.push({ role: 'user', content: text, created_at: new Date().toISOString() });

    const reply: ChatMessage = { role: 'assistant', content: '', created_at: new Date().toISOString() };
    this.messages.push(reply);

    const streamRequest = () => {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;

      this.streamSub = this.auth.streamMessage(currentToken, text).subscribe({
        next: (chunk) => {
          reply.content += chunk;
          this.shouldScroll = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.message.includes('401')) {
            this.attemptRefreshAndRetry(streamRequest, () => {
              reply.content = 'Session expired. Please log in again.';
              this.streaming = false;
              this.shouldScroll = true;
              this.cdr.detectChanges();
            });
          } else {
            reply.content = reply.content || `Error: ${err.message}`;
            this.streaming = false;
            this.shouldScroll = true;
            this.cdr.detectChanges();
          }
        },
        complete: () => {
          this.streaming = false;
          this.shouldScroll = true;
          this.cdr.detectChanges();
        },
      });
    };

    streamRequest();
  }

  logout(): void {
    this.streamSub?.unsubscribe();
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    this.router.navigateByUrl('/');
  }

  private attemptRefreshAndRetry(retryCb: () => void, fallbackCb?: () => void): void {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.logout();
      if (fallbackCb) fallbackCb();
      return;
    }

    this.auth.refreshToken(refreshToken).subscribe({
      next: (res) => {
        if (res.access_token) {
          localStorage.setItem('token', res.access_token);
          if (res.refresh_token) {
            localStorage.setItem('refresh_token', res.refresh_token);
          }
          retryCb();
        } else {
          this.logout();
          if (fallbackCb) fallbackCb();
        }
      },
      error: () => {
        this.logout();
        if (fallbackCb) fallbackCb();
      }
    });
  }

  lastMsgEmpty(): boolean {
    const last = this.messages[this.messages.length - 1];
    return last?.role === 'assistant' && last.content === '';
  }

  formatContent(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollEl.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }
}
