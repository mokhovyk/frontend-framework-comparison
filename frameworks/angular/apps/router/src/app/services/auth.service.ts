import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _isAuthenticated = signal(false);
  private readonly _user = signal<string | null>(null);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly user = this._user.asReadonly();

  login(username: string, _password: string): boolean {
    this._isAuthenticated.set(true);
    this._user.set(username);
    return true;
  }

  logout(): void {
    this._isAuthenticated.set(false);
    this._user.set(null);
  }
}
