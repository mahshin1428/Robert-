import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="shell auth-shell">
      <section class="hero">
        <p class="eyebrow">Robert</p>
        <h1>Sign in to continue your chat history.</h1>
        <p class="lede">A lightweight authenticated chatbot with persistent per-user conversations.</p>
      </section>

      <section class="card">
        <h2>Access account</h2>
        <label>
          <span>Username</span>
          <input [(ngModel)]="username" placeholder="your name" />
        </label>
        <label>
          <span>Password</span>
          <input [(ngModel)]="password" type="password" placeholder="••••••••" />
        </label>
        <div class="actions">
          <button class="secondary" (click)="register()">Register</button>
          <button (click)="login()">Login</button>
        </div>
        <p class="message" *ngIf="message">{{ message }}</p>
      </section>
    </main>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        gap: 2rem;
        padding: 2rem;
      }
      .auth-shell {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        max-width: 1100px;
        margin: 0 auto;
      }
      .hero h1 { font-size: clamp(2.2rem, 5vw, 4.5rem); line-height: 0.95; margin: 0; }
      .lede { max-width: 36rem; color: var(--muted); font-size: 1.05rem; }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.22em; color: var(--accent-strong); }
      .card { width: 100%; max-width: 420px; background: var(--panel); border: 1px solid var(--border); border-radius: 24px; padding: 1.5rem; box-shadow: 0 20px 50px rgba(30, 27, 24, 0.08); }
      label { display: grid; gap: 0.45rem; margin: 1rem 0; }
      span { font-size: 0.9rem; color: var(--muted); }
      input { border: 1px solid var(--border); border-radius: 14px; padding: 0.9rem 1rem; background: white; }
      .actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
      button { border: 0; border-radius: 999px; padding: 0.9rem 1.2rem; background: var(--accent); color: white; cursor: pointer; }
      button.secondary { background: transparent; color: var(--accent-strong); border: 1px solid var(--border); }
      .message { margin-top: 1rem; color: var(--accent-strong); }
    `,
  ],
})
export class AuthViewComponent {
  username = '';
  password = '';
  message = '';

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  register(): void {
    this.auth.register(this.username, this.password).subscribe({
      next: (response) => (this.message = response.msg ?? 'Registered successfully'),
      error: (error) => (this.message = error?.error?.detail ?? 'Registration failed'),
    });
  }

  login(): void {
    this.auth.login(this.username, this.password).subscribe({
      next: (response) => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          this.router.navigateByUrl('/chat');
        }
      },
      error: (error) => (this.message = error?.error?.detail ?? 'Login failed'),
    });
  }
}
