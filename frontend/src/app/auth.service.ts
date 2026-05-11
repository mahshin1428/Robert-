import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthResponse, ChatMessage } from './api.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient, private readonly zone: NgZone) {}

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBase}/auth/register`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBase}/auth/login`, { username, password });
  }

  refreshToken(refresh_token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBase}/auth/refresh`, { refresh_token });
  }

  history(token: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiBase}/history`, {
      headers: this.authHeaders(token),
    });
  }

  streamMessage(token: string, message: string): Observable<string> {
    return new Observable(subscriber => {
      const controller = new AbortController();

      fetch(`${environment.apiBase}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      })
        .then(response => {
          if (!response.ok) {
            this.zone.run(() => subscriber.error(new Error(`HTTP ${response.status}`)));
            return;
          }
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

          const pump = (): void => {
            reader.read().then(({ done, value }) => {
              if (done) {
                this.zone.run(() => subscriber.complete());
                return;
              }
              this.zone.run(() => subscriber.next(decoder.decode(value, { stream: true })));
              pump();
            }).catch(err => this.zone.run(() => subscriber.error(err)));
          };

          pump();
        })
        .catch(err => {
          if (err.name !== 'AbortError') this.zone.run(() => subscriber.error(err));
        });

      return () => controller.abort();
    });
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
