import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthTokenService {
  private tokenSignal = signal<string | null>(null);

  getToken(): string {
    return this.tokenSignal() || '';
  }

  setToken(token: string | null): void {
    this.tokenSignal.set(token);
  }

  removeToken(): void {
    this.tokenSignal.set(null);
  }

  hasToken(): boolean {
    return Boolean(this.tokenSignal());
  }
}
