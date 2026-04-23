import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../environments/environment';

interface LoginResponse {
  token: string;
  expiresAt: number;
  username: string;
}

const STORAGE_KEY = 'jokoivi-auth-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenState = signal<string | null>(this.readStoredToken());

  readonly token = this.tokenState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenState());

  login(username: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, { username, password })
      .pipe(tap((response) => this.setToken(response.token)));
  }

  logout(): void {
    this.tokenState.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  setToken(token: string): void {
    this.tokenState.set(token);
    localStorage.setItem(STORAGE_KEY, token);
  }

  private readStoredToken(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }
}
