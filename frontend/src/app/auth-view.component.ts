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
    <div class="page">
      <div class="card">
        <div class="brand">
          <div class="brand-icon">R</div>
          <span class="brand-name">Robert</span>
        </div>
        <p class="tagline">Your AI assistant with persistent memory.</p>

        <div class="tabs">
          <button [class.active]="mode === 'login'" (click)="switchMode('login')">Sign in</button>
          <button [class.active]="mode === 'register'" (click)="switchMode('register')">Create account</button>
        </div>

        <div class="form">
          <div class="field">
            <label for="username">Username</label>
            <input
              id="username"
              [(ngModel)]="username"
              placeholder="Enter username"
              autocomplete="username"
              (keydown.enter)="submit()"
            />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input
              id="password"
              [(ngModel)]="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              (keydown.enter)="submit()"
            />
          </div>

          <div class="feedback error" *ngIf="errorMsg">{{ errorMsg }}</div>
          <div class="feedback success" *ngIf="successMsg">{{ successMsg }}</div>

          <button class="submit-btn" (click)="submit()" [disabled]="loading">
            <span class="spinner-sm" *ngIf="loading"></span>
            {{ loading ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Create account') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: #0f0f14;
    }

    .card {
      width: 100%;
      max-width: 400px;
      background: #12121a;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .brand-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #7c6af5, #a78bfa);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: white;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 1.3rem;
      font-weight: 700;
      color: #ededf5;
    }

    .tagline {
      color: #8f8fa8;
      font-size: 0.875rem;
      margin: 0 0 1.75rem;
    }

    .tabs {
      display: flex;
      background: #0f0f14;
      border-radius: 10px;
      padding: 3px;
      margin-bottom: 1.5rem;
      gap: 2px;
    }

    .tabs button {
      flex: 1;
      border: none;
      background: transparent;
      color: #8f8fa8;
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.15s;
    }

    .tabs button.active {
      background: #23233a;
      color: #ededf5;
    }

    .tabs button:not(.active):hover {
      color: #c4c4d4;
    }

    .field {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      font-size: 0.8125rem;
      color: #8f8fa8;
      margin-bottom: 0.4rem;
      font-weight: 500;
    }

    input {
      width: 100%;
      background: #1e1e2e;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 0.75rem 0.875rem;
      color: #ededf5;
      font-size: 0.9375rem;
      transition: border-color 0.15s;
    }

    input:focus {
      outline: none;
      border-color: rgba(124,106,245,0.5);
    }

    input::placeholder { color: rgba(143,143,168,0.6); }

    .feedback {
      padding: 0.65rem 0.875rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .error {
      background: rgba(248,81,73,0.1);
      color: #f87171;
      border: 1px solid rgba(248,81,73,0.2);
    }

    .success {
      background: rgba(63,185,80,0.1);
      color: #4ade80;
      border: 1px solid rgba(63,185,80,0.2);
    }

    .submit-btn {
      width: 100%;
      background: #7c6af5;
      border: none;
      border-radius: 10px;
      padding: 0.8rem 1rem;
      color: white;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .submit-btn:hover:not(:disabled) { background: #6d5bd0; }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .spinner-sm {
      width: 15px;
      height: 15px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.65s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AuthViewComponent {
  mode: 'login' | 'register' = 'login';
  username = '';
  password = '';
  errorMsg = '';
  successMsg = '';
  loading = false;

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  switchMode(m: 'login' | 'register'): void {
    this.mode = m;
    this.errorMsg = '';
    this.successMsg = '';
  }

  submit(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMsg = 'Please fill in all fields.';
      return;
    }

    this.errorMsg = '';
    this.successMsg = '';
    this.loading = true;

    if (this.mode === 'register') {
      this.auth.register(this.username, this.password).subscribe({
        next: () => {
          this.loading = false;
          this.successMsg = 'Account created! You can now sign in.';
          setTimeout(() => {
            this.mode = 'login';
            this.password = '';
          }, 1500);
        },
        error: (err) => {
          this.loading = false;
          this.errorMsg = err?.error?.detail ?? 'Registration failed. Please try again.';
        },
      });
    } else {
      this.auth.login(this.username, this.password).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.access_token) {
            localStorage.setItem('token', res.access_token);
            if (res.refresh_token) {
              localStorage.setItem('refresh_token', res.refresh_token);
            }
            this.router.navigateByUrl('/chat');
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMsg = err?.error?.detail ?? 'Invalid credentials. Please try again.';
        },
      });
    }
  }
}
