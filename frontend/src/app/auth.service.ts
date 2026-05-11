import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthResponse, ChatMessage } from './api.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBase}/auth/register`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBase}/auth/login`, { username, password });
  }

  history(token: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiBase}/history`, {
      headers: this.headers(token),
    });
  }

  sendMessage(token: string, message: string): Observable<{ reply: string }> {
    return this.http.post<{ reply: string }>(
      `${environment.apiBase}/chat`,
      { message },
      { headers: this.headers(token) },
    );
  }

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
